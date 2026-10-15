// 更新：2026-10-15 14:32（UTC+8）；总自动复用地区组测速，并纳入同质量冷门原始节点。
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
      "+.bing.com": [
        "https://1.1.1.1/dns-query#🚦节点选择",
        "https://8.8.8.8/dns-query#🚦节点选择"
      ],
      "geosite:cn": [
        "https://223.5.5.5/dns-query#DIRECT",
        "https://1.12.12.12/dns-query#DIRECT"
      ]
    }
  };
  // ============================================================================
  // 1.5 节点名称预处理（保留国旗及高低质量标记，清理其他装饰 emoji）
  // ============================================================================
  // ⬢、⬡ 已由 rename 判定；这里保留，不重新判断倍率或来源档次。
  const decorativeEmoji = /\p{Extended_Pictographic}[\uFE0E\uFE0F]?|[0-9#*]\uFE0F?\u20E3/gu;
  const keepEmoji = /^(?:[0-9]\uFE0F?\u20E3|[Ⓜ\u{1F130}-\u{1F149}\u{1F170}-\u{1F189}][\uFE0E\uFE0F]?)$/u;
  if (config.proxies && Array.isArray(config.proxies)) {
    const nameTracker = new Map();
    const renamedNodes = new Map();

    config.proxies.forEach((p, index) => {
      if (typeof p.name === "string") {
        const originalName = p.name;
        const baseName = p.name
          .replace(decorativeEmoji, emoji => keepEmoji.test(emoji) ? emoji : "")
          .replace(/[\u{1F3FB}-\u{1F3FF}\u200D]/gu, "")
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
  const regexHighQuality = /^⬢/u;
  const regexLowQuality = /^⬡/u;

  const regionData = {
    "香港": { emoji: "🇭🇰", keywords: ["香港", "(?<![a-zA-Z])(?:HK|HKG|Hong[\\s_-]*Kong)(?![a-zA-Z])"] },
    "台湾": { emoji: "🇹🇼", keywords: ["台湾", "臺灣", "台灣", "新北", "彰化", "台北", "臺北", "(?<![a-zA-Z])(?:TW|TWN|Tai[\\s_-]*wan|Taipei|TPE|TSA|KHH)(?![a-zA-Z])"] },
    "新加坡": { emoji: "🇸🇬", keywords: ["新加坡", "星加坡", "狮城", "獅城", "(?<![a-zA-Z])(?:SG|SGP|Singapore|SIN|XSP)(?![a-zA-Z])"] },
    "韩国": { emoji: "🇰🇷", keywords: ["韩国", "韓國", "首尔", "首爾", "春川", "南朝鲜", "(?<![a-zA-Z])(?:KR|KOR|South[\\s_-]*Korea|Seoul|Chuncheon|ICN)(?![a-zA-Z])"] },
    "日本": { emoji: "🇯🇵", keywords: ["日本", "东京", "東京", "大[阪坂]", "埼玉", "(?<![a-zA-Z])(?:JP|JPN|Japan|Tokyo|Osaka|NRT|HND|KIX|CTS|FUK)(?![a-zA-Z])"] },
    "美国": { emoji: "🇺🇸", keywords: ["美国", "美國", "波特兰", "达拉斯", "俄勒冈", "凤凰城", "费利蒙", "硅谷", "拉斯维加斯", "洛杉矶", "圣何塞", "圣克拉拉", "西雅图", "芝加哥", "哥伦布", "纽约", "(?<![a-zA-Z])(?:US|USA|United[\\s_-]*States|Los[\\s_-]*Angeles|San[\\s_-]*Jose|Silicon[\\s_-]*Valley|Michigan|ATL|BUF|DFW|EWR|IAD|JFK|LAX|MCI|MIA|ORD|PDX|PHX|SEA|SFO|SJC)(?![a-zA-Z])"] },
  };

  // 只读取开头主国旗；文字兜底不检查 # 后的机场名。
  const standardFlags = ["🇭🇰","🇲🇴","🇹🇼","🇯🇵","🇰🇵","🇰🇷","🇸🇬","🇺🇸","🇬🇧","🇫🇷","🇩🇪","🇦🇺","🇦🇪","🇦🇫","🇦🇱","🇩🇿","🇦🇴","🇦🇷","🇦🇲","🇦🇹","🇦🇿","🇧🇭","🇧🇩","🇧🇾","🇧🇪","🇧🇿","🇧🇯","🇧🇹","🇧🇴","🇧🇦","🇧🇼","🇧🇷","🇻🇬","🇧🇳","🇧🇬","🇧🇫","🇧🇮","🇰🇭","🇨🇲","🇨🇦","🇨🇻","🇰🇾","🇨🇫","🇹🇩","🇨🇱","🇨🇴","🇰🇲","🇨🇩","🇨🇬","🇨🇷","🇭🇷","🇨🇾","🇨🇿","🇩🇰","🇩🇯","🇩🇴","🇪🇨","🇪🇬","🇸🇻","🇬🇶","🇪🇷","🇪🇪","🇪🇹","🇫🇯","🇫🇮","🇬🇦","🇬🇲","🇬🇪","🇬🇭","🇬🇷","🇬🇱","🇬🇹","🇬🇼","🇬🇳","🇬🇾","🇭🇹","🇭🇳","🇭🇺","🇮🇸","🇮🇩","🇮🇳","🇮🇷","🇮🇶","🇮🇪","🇮🇲","🇮🇱","🇮🇹","🇨🇮","🇯🇲","🇯🇴","🇰🇿","🇰🇪","🇰🇼","🇰🇬","🇱🇦","🇱🇻","🇱🇧","🇱🇸","🇱🇷","🇱🇾","🇱🇹","🇱🇺","🇲🇰","🇲🇬","🇲🇼","🇲🇾","🇲🇻","🇸🇴","🇲🇱","🇲🇹","🇲🇷","🇲🇺","🇲🇽","🇲🇩","🇲🇨","🇲🇳","🇲🇪","🇲🇦","🇲🇿","🇲🇲","🇳🇦","🇳🇵","🇳🇱","🇳🇿","🇳🇮","🇳🇪","🇳🇬","🇳🇴","🇴🇲","🇵🇰","🇵🇦","🇵🇾","🇵🇪","🇵🇭","🇵🇹","🇵🇷","🇶🇦","🇷🇴","🇷🇺","🇷🇼","🇸🇲","🇸🇦","🇸🇳","🇷🇸","🇸🇱","🇸🇰","🇸🇮","🇿🇦","🇪🇸","🇱🇰","🇸🇩","🇸🇷","🇸🇿","🇸🇪","🇨🇭","🇸🇾","🇹🇯","🇹🇿","🇹🇭","🇹🇬","🇹🇴","🇹🇹","🇹🇳","🇹🇷","🇹🇲","🇻🇮","🇺🇬","🇺🇦","🇺🇾","🇺🇿","🇻🇪","🇻🇳","🇾🇪","🇿🇲","🇿🇼","🇦🇩","🇷🇪","🇵🇱","🇬🇺","🇻🇦","🇱🇮","🇨🇼","🇸🇨","🇦🇶","🇬🇮","🇨🇺","🇫🇴","🇦🇽","🇧🇲","🇹🇱"];
  const standardFlagPattern = "(?:" + standardFlags.join("|") + ")";
  const regionPrefix = "(?:[⬢⬡]\\s*)?";
  const regexRegions = {};
  for (const [region, data] of Object.entries(regionData)) {
    regexRegions[region] = new RegExp(`^(?:${regionPrefix}${data.emoji}|(?!${regionPrefix}${standardFlagPattern})(?=[^#]*(?:${data.keywords.join('|')})))`, 'iu');
  }

  const allEmojis = Object.values(regionData).map(d => d.emoji);
  const allKeywords = Object.values(regionData).flatMap(d => d.keywords);
  const regexMainRegions = new RegExp(`^(?:${regionPrefix}(?:${allEmojis.join('|')})|(?!${regionPrefix}${standardFlagPattern})(?=[^#]*(?:${allKeywords.join('|')})))`, 'iu');

  // ============================================================================
  // 3. 策略组装 (竖排易编辑排版)
  // ============================================================================
  const probe = {
    url: "https://cp.cloudflare.com/generate_204",
    timeout: 2000,
    "expected-status": 204
  };
  const baseUT = {
    ...probe,
    type: "url-test", 
    interval: 60,
    tolerance: 50,
    "max-failed-times": 2,
    lazy: true, 
    "empty-fallback": "REJECT",
    hidden: true 
  };
  
  // 高低质量只影响可选节点池，不改变 baseUT 的测速参数。
  const high = {
    auto: "⬢♻️自动选择",
    jp: "⬢🇯🇵日本节点",
    us: "⬢🇺🇸美国节点",
    hk: "⬢🇭🇰香港节点",
    tw: "⬢🇹🇼台湾节点",
    sg: "⬢🇸🇬新加坡节点",
    kr: "⬢🇰🇷韩国节点",
    cold: "⬢🧊冷门节点"
  };
  const low = {
    auto: "⬡♻️自动选择",
    jp: "⬡🇯🇵日本节点",
    us: "⬡🇺🇸美国节点",
    hk: "⬡🇭🇰香港节点",
    tw: "⬡🇹🇼台湾节点",
    sg: "⬡🇸🇬新加坡节点",
    kr: "⬡🇰🇷韩国节点",
    cold: "⬡🧊冷门节点"
  };
  const highRegionalPools = [high.jp, high.us, high.hk, high.tw, high.sg, high.kr, high.cold];
  const lowRegionalPools = [low.jp, low.us, low.hk, low.tw, low.sg, low.kr, low.cold];
  const highAllPools = [high.auto, ...highRegionalPools];
  const lowAllPools = [low.auto, ...lowRegionalPools];
  const allQualityPools = [...highAllPools, ...lowAllPools];
  const select = (name, proxies, extra = {}) => ({
    ...probe,
    name,
    type: "select",
    ...(proxies ? { proxies } : {}),
    ...extra
  });
  const qualityFilter = (quality, region) =>
    "(?i)(?=" + (region || regexMainRegions).source + ")" + quality.source + ".*$";
  const coldFilter = quality =>
    "(?i)(?!" + regexMainRegions.source + ")" + quality.source + ".*$";
  const autoPool = (name, quality, region) =>
    Object.assign({}, baseUT, {
      name,
      "include-all": true,
      filter: qualityFilter(quality, region)
    });

  config["proxy-groups"] = [
    // 业务面板顺序与单分组保持一致。
    select("🚦节点选择", [...highAllPools, "👆手动选择", ...lowAllPools], { "include-all": true }),
    select("👆手动选择", [...highRegionalPools, ...lowRegionalPools], { "include-all": true }),
    select("🤖人工智能", [
      high.us, high.jp, low.us, low.jp, "🚦节点选择", "👆手动选择",
      high.auto, high.tw, high.sg, high.kr, high.cold,
      low.auto, low.tw, low.sg, low.kr, low.cold
    ], {
      "include-all": true,
      "exclude-filter": "(?i)" + regexRegions["香港"].source
    }),
    select("🪙Crypto", [
      high.sg, high.us, high.hk, high.tw, "🚦节点选择", "👆手动选择",
      high.kr, high.jp, high.cold, high.auto,
      low.kr, low.jp, low.cold, low.auto,
      low.us, low.hk, low.tw, low.sg, "🎯全球直连"
    ], { "include-all": true }),
    select("📺油管视频", [
      low.auto, high.auto, ...lowRegionalPools,
      "🚦节点选择", "👆手动选择", ...highRegionalPools
    ]),
    select("📲社交平台", [
      high.auto, low.auto, "🚦节点选择", "👆手动选择",
      ...highRegionalPools, ...lowRegionalPools
    ]),
    select("🍿国际媒体", [
      low.auto, high.auto, "🚦节点选择", "👆手动选择",
      ...lowRegionalPools, ...highRegionalPools
    ]),
    select("🇬谷歌服务", ["🤖人工智能", "🚦节点选择", "👆手动选择", ...highAllPools, ...lowAllPools, "🎯全球直连"]),
    select("Ⓜ️微软服务", ["🤖人工智能", "🚦节点选择", "👆手动选择", "🎯全球直连", ...highAllPools, ...lowAllPools]),
    select("🍎苹果服务", ["🤖人工智能", "🎯全球直连", "🚦节点选择", "👆手动选择", ...highAllPools, ...lowAllPools]),
    select("🎮游戏平台", ["🎯全球直连", "🚦节点选择", "👆手动选择", ...highAllPools, ...lowAllPools]),
    // 没有成员时返回 REJECT，避免空分组显示为可测速的 COMPATIBLE。
    select(high.cold, null, {
      "empty-fallback": "REJECT",
      "include-all": true,
      filter: coldFilter(regexHighQuality)
    }),
    select(low.cold, null, {
      "empty-fallback": "REJECT",
      "include-all": true,
      filter: coldFilter(regexLowQuality)
    }),

    select("🎯全球直连", ["DIRECT", "👆手动选择", ...highAllPools, ...lowAllPools]),
    select("🐟漏网之鱼", ["🚦节点选择", "👆手动选择", "🎯全球直连", ...allQualityPools]),
    select("🍃净化拦截", ["REJECT", "DIRECT"]),

    // 所有 url-test 均继承单分组的 baseUT。
    // 地区组检测常见节点；总自动只检测地区出口及冷门原始节点。
    { ...baseUT, name: high.auto,
      proxies: [high.hk, high.tw, high.jp, high.us, high.sg, high.kr],
      "include-all": true, filter: coldFilter(regexHighQuality) },
    autoPool(high.hk, regexHighQuality, regexRegions["香港"]),
    autoPool(high.tw, regexHighQuality, regexRegions["台湾"]),
    autoPool(high.jp, regexHighQuality, regexRegions["日本"]),
    autoPool(high.us, regexHighQuality, regexRegions["美国"]),
    autoPool(high.sg, regexHighQuality, regexRegions["新加坡"]),
    autoPool(high.kr, regexHighQuality, regexRegions["韩国"]),
    { ...baseUT, name: low.auto,
      proxies: [low.hk, low.tw, low.jp, low.us, low.sg, low.kr],
      "include-all": true, filter: coldFilter(regexLowQuality) },
    autoPool(low.hk, regexLowQuality, regexRegions["香港"]),
    autoPool(low.tw, regexLowQuality, regexRegions["台湾"]),
    autoPool(low.jp, regexLowQuality, regexRegions["日本"]),
    autoPool(low.us, regexLowQuality, regexRegions["美国"]),
    autoPool(low.sg, regexLowQuality, regexRegions["新加坡"]),
    autoPool(low.kr, regexLowQuality, regexRegions["韩国"])
  ];
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
    
    // IP 检测网站统一走 AI 组
    "DOMAIN-SUFFIX,ipforai.cc,🤖人工智能",
    "DOMAIN-SUFFIX,ipjudge.org,🤖人工智能",
    "DOMAIN-SUFFIX,ipure.dev,🤖人工智能",
    "DOMAIN-SUFFIX,ping0.cc,🤖人工智能",
    "DOMAIN-SUFFIX,ippure.com,🤖人工智能",
    "DOMAIN-SUFFIX,cleanip.io,🤖人工智能",
    
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
