function main(config) {
  // ============================================================================
  // 1. 核心系统参数注入
  // ============================================================================
  // 端口与 external-controller 交由客户端管理，避免跨平台覆写冲突。
  config["allow-lan"] = true;
  config["bind-address"] = "*";
  config["unified-delay"] = true;
  config["mode"] = "rule";
  config["ipv6"] = false;
  config["tcp-concurrent"] = true;

  config["profile"] = {
    ...config["profile"],
    "store-selected": true,
    "store-fake-ip": true
  };

  // 保留客户端的 TUN 开关、协议栈与严格路由设置。
  config["tun"] = {
    ...config["tun"],
    "auto-route": true,
    "auto-detect-interface": true,
    "dns-hijack": ["any:53", "tcp://any:53"]
  };

  config["sniffer"] = {
    "enable": true,
    "parse-pure-ip": true,
    "override-destination": false,
    "sniff": {
      "HTTP": { "ports": [80, "8080-8880"] },
      "TLS": { "ports": [443, 8443] },
      "QUIC": { "ports": [443, 8443] }
    },
    "skip-domain": ["Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com"]
  };

  config["dns"] = {
    "enable": true,
    "listen": "0.0.0.0:1053",
    "ipv6": false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "respect-rules": true,
    "use-hosts": false,
    "use-system-hosts": false,
    "fake-ip-filter": [
      "geosite:private",
      "geosite:category-ntp",
      "+.stun.*",
      "+.stun.*.*",
      "stun.*.*",
      "+.push.apple.com"
    ],
    "nameserver": [
      "https://1.1.1.1/dns-query#🚦节点选择",
      "https://8.8.8.8/dns-query#🚦节点选择"
    ],
    "proxy-server-nameserver": [
      "https://223.5.5.5/dns-query#DIRECT",
      "https://1.12.12.12/dns-query#DIRECT"
    ],
    "nameserver-policy": {
      "geosite:private": "system",
      "geosite:cn": [
        "https://223.5.5.5/dns-query#DIRECT",
        "https://1.12.12.12/dns-query#DIRECT"
      ]
    }
  };
  // ============================================================================
  // 1.5 节点名称预处理（保留国旗，清理装饰 emoji）
  // ============================================================================
  const decorativeEmoji = /(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|[0-9#*]\uFE0F?\u20E3)/gu;
  if (config.proxies && Array.isArray(config.proxies)) {
    const nameTracker = new Map();
    const renamedNodes = new Map();

    config.proxies.forEach((p, index) => {
      if (typeof p.name === "string") {
        const originalName = p.name;
        const baseName = p.name
          .replace(decorativeEmoji, "")
          .replace(/[\u{1F3FB}-\u{1F3FF}\uFE0E\uFE0F\u200D]/gu, "")
          .replace(/\s{2,}/g, " ")
          .trim() || `节点 ${index + 1}`;

        let suffix = nameTracker.get(baseName) || 1;
        let uniqueName = baseName;
        while (renamedNodes.has(uniqueName)) {
          suffix += 1;
          uniqueName = `${baseName} #${suffix}`;
        }
        nameTracker.set(baseName, suffix);
        renamedNodes.set(uniqueName, uniqueName);
        renamedNodes.set(originalName, uniqueName);
        p.name = uniqueName;
      }
    });

    config.proxies.forEach(p => {
      if (typeof p["dialer-proxy"] === "string" && renamedNodes.has(p["dialer-proxy"])) {
        p["dialer-proxy"] = renamedNodes.get(p["dialer-proxy"]);
      }
    });
  }

  // ============================================================================
  // 2. 高性能正则匹配引擎
  // ============================================================================
  // 识别 0～0.8 倍的任意小数精度，例如 0.25x、x0.25、0.800 倍；不匹配 0.81x、10.5x。
  const lowRateMultiplier = String.raw`0(?:\.(?:[0-7]\d*|80*))?`;
  const regexLowRate = new RegExp(
    String.raw`(?:(?<![\d.])${lowRateMultiplier}\s*(?:[xX×]|倍)(?![\d.])|(?<![\d.])(?:[xX×])\s*${lowRateMultiplier}(?![\d.])|低倍率|省流|实验性|免费|test|beta)`,
    "iu"
  );

  const regionData = {
    "香港": { emoji: "🇭🇰", keywords: ["香港", "港", "(?:深|沪|呼|京|广|杭)港", "(?<![a-zA-Z])HK(?![a-zA-Z])", "Hong(?:Kong)?", "HKG"] },
    "台湾": { emoji: "🇹🇼", keywords: ["台湾", "台", "新北", "彰化", "台北", "(?<![a-zA-Z])TW(?![a-zA-Z])", "Tai\\s?wan", "Tai(?:pei)?", "TPE", "TSA", "KHH"] },
    "新加坡": { emoji: "🇸🇬", keywords: ["新加坡", "坡", "狮城", "(?:深|沪|呼|京|广|杭)新", "(?<![a-zA-Z])SG(?![a-zA-Z])", "Sing(?:apore)?", "SIN", "XSP"] },
    "韩国": { emoji: "🇰🇷", keywords: ["韩国", "韩", "韓", "首尔", "春川", "南朝鲜", "(?<![a-zA-Z])KR(?![a-zA-Z])", "KOR", "Korea", "South Korea", "Seoul", "Chuncheon", "ICN"] },
    "日本": { emoji: "🇯🇵", keywords: ["日本", "东京", "大[阪坂]", "埼玉", "(?:川|泉|沪|深|中|辽)日", "[^-]日", "(?<![a-zA-Z])JP(?![a-zA-Z])", "Japan", "Tokyo", "Osaka", "NRT", "HND", "KIX", "CTS", "FUK"] },
    "美国": { emoji: "🇺🇸", keywords: ["美国", "美", "波特兰", "达拉斯", "俄勒冈", "凤凰城", "费利蒙", "硅谷", "拉斯维加斯", "洛杉矶", "圣何塞", "圣克拉拉", "西雅图", "芝加哥", "哥伦布", "纽约", "(?:深|沪|呼|京|广|杭)美", "(?<![a-zA-Z])US(?:A)?(?![a-zA-Z])", "United States", "Los Angeles", "San Jose", "Silicon Valley", "Michigan", "ATL", "BUF", "DFW", "EWR", "IAD", "JFK", "LAX", "MCI", "MIA", "ORD", "PDX", "PHX", "SEA", "SFO", "SJC"] },
  };

  const regexRegions = {};
  for (const [region, data] of Object.entries(regionData)) {
    regexRegions[region] = new RegExp(`(?:${data.emoji}|${data.keywords.join('|')})`, 'iu');
  }

  const allEmojis = Object.values(regionData).map(d => d.emoji);
  const allKeywords = Object.values(regionData).flatMap(d => d.keywords);
  const regexMainRegions = new RegExp(`(?:${allEmojis.join('|')}|${allKeywords.join('|')})`, 'iu');

  // ============================================================================
  // 3. 策略组装 (竖排易编辑排版)
  // ============================================================================
  const baseUT = { 
    type: "url-test", 
    interval: 60,
    tolerance: 50,
    timeout: 3000,
    "max-failed-times": 2,
    lazy: true, 
    url: "https://cp.cloudflare.com/generate_204", 
    "expected-status": 204,
    "empty-fallback": "REJECT",
    hidden: true 
  };
  
  config["proxy-groups"] = [
    {
      name: "🚦节点选择",
      type: "select",
      proxies: [
        "♻️自动选择",
        "🇯🇵日本节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
        "👆手动选择",
        "🐢低倍率节点",
      ],
      "include-all": true
    },
    {
      name: "👆手动选择",
      type: "select",
      proxies: [
        "🇯🇵日本节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
        "🐢低倍率节点"
      ],
      "include-all": true
    },
    {
      name: "🤖人工智能",
      type: "select",
      proxies: [
        "🇺🇸美国节点",
        "🚦节点选择",
        "👆手动选择",
        "♻️自动选择",
        "🇯🇵日本节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
      ],
      "include-all": true,
      "exclude-filter": `(?i)${regexRegions["香港"].source}`
    },
    {
      name: "🪙Crypto",
      type: "select",
      proxies: [
        "🇸🇬新加坡节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🚦节点选择",
        "👆手动选择",
        "🇯🇵日本节点",
        "🇰🇷韩国节点",
        "♻️自动选择",
        "🧊冷门节点",
        "🐢低倍率节点",
        "🎯全球直连"
      ],
      "include-all": true
    },
    {
      name: "📺油管视频",
      type: "select",
      proxies: [
        "♻️自动选择",
        "🚦节点选择",
        "👆手动选择",
        "🐢低倍率节点",
        "🇯🇵日本节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
      ]
    },
    {
      name: "📲社交平台",
      type: "select",
      proxies: [
        "♻️自动选择",
        "🚦节点选择",
        "👆手动选择",
        "🇯🇵日本节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
        "🐢低倍率节点",
      ]
    },
    {
      name: "🍿国际媒体",
      type: "select",
      proxies: [
        "♻️自动选择",
        "🚦节点选择",
        "👆手动选择",
        "🐢低倍率节点",
        "🇯🇵日本节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
      ]
    },
    {
      name: "🇬谷歌服务",
      type: "select",
      proxies: [
        "🤖人工智能",
        "🚦节点选择",
        "👆手动选择",
        "♻️自动选择",
        "🇯🇵日本节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
        "🐢低倍率节点",
        "🎯全球直连"
      ]
    },
    {
      name: "Ⓜ️微软服务",
      type: "select",
      proxies: [
        "🤖人工智能",
        "🚦节点选择",
        "👆手动选择",
        "🎯全球直连",
        "♻️自动选择",
        "🇯🇵日本节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
        "🐢低倍率节点",
      ]
    },
    {
      name: "🍎苹果服务",
      type: "select",
      proxies: [
        "🤖人工智能",
        "🎯全球直连",
        "🚦节点选择",
        "👆手动选择",
        "♻️自动选择",
        "🇯🇵日本节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
        "🐢低倍率节点",
      ]
    },
    {
      name: "🎮游戏平台",
      type: "select",
      proxies: [
        "🎯全球直连",
        "🚦节点选择",
        "👆手动选择",
        "♻️自动选择",
        "🇯🇵日本节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
        "🐢低倍率节点",
      ]
    },
    {
      name: "🎯全球直连",
      type: "select",
      proxies: [
        "DIRECT",
        "👆手动选择",
        "♻️自动选择",
        "🇯🇵日本节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
        "🐢低倍率节点",
      ]
    },
    {
      name: "🐟漏网之鱼",
      type: "select",
      proxies: [
        "🚦节点选择",
        "👆手动选择",
        "🎯全球直连",
        "♻️自动选择",
        "🇯🇵日本节点",
        "🇺🇸美国节点",
        "🇭🇰香港节点",
        "🇹🇼台湾节点",
        "🇸🇬新加坡节点",
        "🇰🇷韩国节点",
        "🧊冷门节点",
        "🐢低倍率节点",
      ]
    },
    {
      name: "🍃净化拦截",
      type: "select",
      proxies: [
        "REJECT",
        "DIRECT"
      ]
    },

    // --- 极简正则分组 (不带 base) ---
    {
      name: "🧊冷门节点",
      type: "select",
      "empty-fallback": "REJECT",
      "include-all": true,
      filter: `(?i)^(?!.*${regexMainRegions.source})(?!.*${regexLowRate.source}).*$`
    },
    {
      name: "🐢低倍率节点",
      type: "select",
      "empty-fallback": "REJECT",
      "include-all": true,
      filter: `(?i)${regexLowRate.source}`
    },
    
    // --- 自动测速池 ---
    Object.assign({}, baseUT, { name: "♻️自动选择", "include-all": true, filter: `(?i)^(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🇭🇰香港节点", "include-all": true, filter: `(?i)^(?=.*${regexRegions["香港"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🇹🇼台湾节点", "include-all": true, filter: `(?i)^(?=.*${regexRegions["台湾"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🇯🇵日本节点", "include-all": true, filter: `(?i)^(?=.*${regexRegions["日本"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🇺🇸美国节点", "include-all": true, filter: `(?i)^(?=.*${regexRegions["美国"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🇸🇬新加坡节点", "include-all": true, filter: `(?i)^(?=.*${regexRegions["新加坡"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🇰🇷韩国节点", "include-all": true, filter: `(?i)^(?=.*${regexRegions["韩国"].source})(?!.*${regexLowRate.source}).*$` })
  ];

  // ============================================================================
  // 4. BETT 整库与外部规则
  // ============================================================================
  config["geodata-mode"] = false;
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;
  config["geox-url"] = {
    "mmdb": "https://cdn.jsdelivr.net/gh/appshubcc/bett-rules@release/geoip.metadb",
    "geosite": "https://cdn.jsdelivr.net/gh/appshubcc/bett-rules@release/geosite.dat",
    "asn": "https://cdn.jsdelivr.net/gh/appshubcc/bett-rules@release/GeoLite2-ASN.mmdb"
  };

  config["rule-providers"] = {
    "AI": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "interval": 86400,
      "url": "https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/clash/global.yaml",
      "path": "./ruleset/AI.yaml"
    },
    "AdBlock": {
      "type": "http",
      "behavior": "domain",
      "format": "mrs",
      "interval": 28800,
      "url": "https://cdn.jsdelivr.net/gh/217heidai/adblockfilters@main/rules/adblockmihomo.mrs",
      "path": "./ruleset/AdBlock.mrs"
    },
    "Emby": {
      "type": "http",
      "behavior": "domain",
      "format": "mrs",
      "interval": 86400,
      "url": "https://cdn.jsdelivr.net/gh/666OS/rules@release/mihomo/domain/Emby.mrs",
      "path": "./ruleset/Emby.mrs"
    },
    "EmbyIP": {
      "type": "http",
      "behavior": "ipcidr",
      "format": "mrs",
      "interval": 86400,
      "url": "https://cdn.jsdelivr.net/gh/666OS/rules@release/mihomo/ip/Emby.mrs",
      "path": "./ruleset/EmbyIP.mrs"
    }
  };

  // ============================================================================
  // 5. 分流规则
  // ============================================================================
  config["rules"] = [

    // 净化拦截
    "RULE-SET,AdBlock,🍃净化拦截",
    "DOMAIN-SUFFIX,gjfzpt.cn,🍃净化拦截",
    "DOMAIN-SUFFIX,chanct.cn,🍃净化拦截",
    "DOMAIN-SUFFIX,fzapp.ifcert.cn,🍃净化拦截",
    // 上传拦截候选，暂不启用。
    // "DOMAIN,a0.app.xiaomi.com,🍃净化拦截",

    // 按需拒绝非中国目的 IP 的 UDP 443，暂不启用。
    // "AND,((NETWORK,UDP),(DST-PORT,443),(NOT,((GEOIP,CN)))),REJECT",

    // 私有网络固定直连
    "GEOSITE,private,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",

    // 人工智能优先
    "DOMAIN-SUFFIX,openevidence.com,🤖人工智能",
    "RULE-SET,AI,🤖人工智能,no-resolve",
    "GEOSITE,apple-intelligence,🤖人工智能",

    // 加密货币、支付与行情
    "GEOSITE,category-cryptocurrency,🪙Crypto",
    "GEOSITE,paypal,🪙Crypto",
    "GEOSITE,wise,🪙Crypto",
    "DOMAIN-SUFFIX,tradingview.com,🪙Crypto",

    // YouTube
    "GEOSITE,youtube,📺油管视频",

    // 社交与通信
    "GEOSITE,category-social-media-!cn,📲社交平台",
    "GEOSITE,category-communication,📲社交平台",
    "GEOSITE,reddit,📲社交平台",
    "GEOSITE,tiktok,📲社交平台",
    "GEOSITE,pinterest,📲社交平台",
    "GEOSITE,tumblr,📲社交平台",
    "GEOSITE,snap,📲社交平台",
    "GEOSITE,quora,📲社交平台",
    "GEOSITE,medium,📲社交平台",
    "GEOSITE,kakao,📲社交平台",
    "GEOSITE,naver,📲社交平台",

    // Bing 优先于微软国内例外
    "GEOSITE,bing,Ⓜ️微软服务",

    // 更新及国内游戏下载优先直连
    "GEOSITE,win-update,🎯全球直连",
    "GEOSITE,category-games-cn,🎯全球直连",
    "GEOSITE,category-games@cn,🎯全球直连",
    "GEOSITE,category-game-platforms-download@cn,🎯全球直连",

    // 其余游戏先于泛娱乐
    "GEOSITE,category-games-!cn,🎮游戏平台",
    "GEOSITE,category-game-platforms-download,🎮游戏平台",

    // 厂商国内适用入口
    "GEOSITE,microsoft@cn,🎯全球直连",
    "GEOSITE,apple@cn,🎯全球直连",

    // 国内娱乐与新闻媒体
    "GEOSITE,category-entertainment-cn,🎯全球直连",
    "GEOSITE,category-media-cn,🎯全球直连",
    "GEOSITE,category-entertainment@cn,🎯全球直连",
    "GEOSITE,category-media@cn,🎯全球直连",

    // 国际媒体及小类补充
    "GEOSITE,category-entertainment,🍿国际媒体",
    "GEOSITE,category-media,🍿国际媒体",
    "GEOSITE,biliintl,🍿国际媒体",
    "GEOSITE,iqiyi@!cn,🍿国际媒体",
    "GEOSITE,streamable,🍿国际媒体",
    "GEOSITE,skyperfect,🍿国际媒体",
    "RULE-SET,Emby,🍿国际媒体",

    // 三大厂商剩余业务
    "GEOSITE,google,🇬谷歌服务",
    "GEOSITE,microsoft,Ⓜ️微软服务",
    "GEOSITE,apple,🍎苹果服务",

    // 通用域名边界
    "GEOSITE,geolocation-!cn,🚦节点选择",
    "GEOSITE,cn,🎯全球直连",

    // 业务 IP 补充，不主动解析
    "GEOIP,telegram,📲社交平台,no-resolve",
    "GEOIP,facebook,📲社交平台,no-resolve",
    "GEOIP,twitter,📲社交平台,no-resolve",
    "GEOIP,tiktok,📲社交平台,no-resolve",
    "GEOIP,netflix,🍿国际媒体,no-resolve",
    "GEOIP,spotify,🍿国际媒体,no-resolve",
    "GEOIP,bilibili,🍿国际媒体,no-resolve",
    "RULE-SET,EmbyIP,🍿国际媒体,no-resolve",
    "GEOIP,steam,🎮游戏平台,no-resolve",
    "GEOIP,google,🇬谷歌服务,no-resolve",
    "GEOIP,microsoft,Ⓜ️微软服务,no-resolve",
    "GEOIP,apple,🍎苹果服务,no-resolve",

    // 中国 IP 与最终兜底
    "GEOIP,CN,🎯全球直连,no-resolve",
    "MATCH,🐟漏网之鱼"
  ];

  return config;
}
