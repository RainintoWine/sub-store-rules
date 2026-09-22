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

  config["sniffer"] = Object.assign({}, config["sniffer"] || {}, {
    "enable": true,
    "parse-pure-ip": true,
    "override-destination": false,
    "sniff": {
      "HTTP": { "ports": [80, "8080-8880"] },
      "TLS": { "ports": [443, 8443] },
      "QUIC": { "ports": [443, 8443] }
    },
    "skip-domain": ["Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com"]
  });

  config["dns"] = {
    "enable": true,
    "ipv6": false,
    "cache-algorithm": "arc",
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "respect-rules": true,
    "use-hosts": false,
    "use-system-hosts": false,
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    "nameserver": ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"],
    "nameserver-policy": {
      "geosite:private": "system",
      "geosite:cn": [
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query"
      ]
    },
    "proxy-server-nameserver": [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query"
    ],
    "direct-nameserver": [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query"
    ],
    "direct-nameserver-follow-policy": true,
    "fake-ip-filter": [
      "geosite:private",
      "geosite:category-ntp",
      "stun.*.*",
      "stun.*.*.*",
      "+.stun.*.*",
      "+.stun.*.*.*",
      "+.push.apple.com",
      "+.miwifi.com",
      "+.market.xiaomi.com"
    ]
  };

  // ============================================================================
  // 2. 高性能正则匹配引擎
  // ============================================================================
  const regexLowRate = /(?:0\.[0-8](?:[xX]|倍)|[xX]0\.[0-8]|低倍率|省流|实验性|免费|test|beta)/iu;
  const regexHighQuality = /🔋/;
  const regexLowQuality = /🪫/;

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
    interval: 300,
    tolerance: 50,
    timeout: 5000,
    "max-failed-times": 2,
    lazy: true, 
    url: "https://cp.cloudflare.com/generate_204", 
    "expected-status": 204,
    hidden: true 
  };
  
  config["proxy-groups"] = [
    {
      name: "🚦节点选择",
      type: "select",
      proxies: [
        "🔋♻️自动选择",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "👆手动选择",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🐢低倍率节点",
      ],
      "include-all": true
    },
    {
      name: "👆手动选择",
      type: "select",
      proxies: [
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🐢低倍率节点"
      ],
      "include-all": true
    },
    {
      name: "🤖人工智能",
      type: "select",
      proxies: [
        "🔋🇺🇸美国节点",
        "🪫🇺🇸美国节点",
        "🚦节点选择",
        "👆手动选择",
        "🔋♻️自动选择",
        "🔋🇯🇵日本节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
      ],
      "include-all": true,
      "exclude-filter": `(?i)${regexRegions["香港"].source}`
    },
    {
      name: "🪙Crypto",
      type: "select",
      proxies: [
        "🔋🇸🇬新加坡节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🚦节点选择",
        "👆手动选择",
        "🔋🇯🇵日本节点",
        "🔋🇰🇷韩国节点",
        "🔋♻️自动选择",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🐢低倍率节点",
        "🎯全球直连"
      ],
      "include-all": true
    },
    {
      name: "🇬谷歌服务",
      type: "select",
      proxies: [
        "🤖人工智能",
        "🚦节点选择",
        "👆手动选择",
        "🔋♻️自动选择",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🐢低倍率节点",
        "🎯全球直连"
      ]
    },
    {
      name: "📺油管视频",
      type: "select",
      proxies: [
        "🪫♻️自动选择",
        "🔋♻️自动选择",
        "🚦节点选择",
        "👆手动选择",
        "🐢低倍率节点",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
      ]
    },
    {
      name: "📲社交平台",
      type: "select",
      proxies: [
        "🔋♻️自动选择",
        "🪫♻️自动选择",
        "🚦节点选择",
        "👆手动选择",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🐢低倍率节点",
      ]
    },
    {
      name: "🍿国际媒体",
      type: "select",
      proxies: [
        "🪫♻️自动选择",
        "🔋♻️自动选择",
        "🚦节点选择",
        "👆手动选择",
        "🐢低倍率节点",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
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
        "🔋♻️自动选择",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🐢低倍率节点",
      ]
    },
    {
      name: "🍎苹果服务",
      type: "select",
      proxies: [
        "🎯全球直连",
        "🚦节点选择",
        "👆手动选择",
        "🔋♻️自动选择",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
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
        "🔋♻️自动选择",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🐢低倍率节点",
      ]
    },
    {
      name: "🎯全球直连",
      type: "select",
      proxies: [
        "DIRECT",
        "👆手动选择",
        "🔋♻️自动选择",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
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
        "🔋♻️自动选择",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
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
      name: "🔋🧊冷门节点",
      type: "select",
      "include-all": true,
      filter: `(?i)^(?=.*${regexHighQuality.source})(?!.*${regexMainRegions.source})(?!.*${regexLowRate.source}).*$`
    },
    {
      name: "🪫🧊冷门节点",
      type: "select",
      "include-all": true,
      filter: `(?i)^(?=.*${regexLowQuality.source})(?!.*${regexMainRegions.source})(?!.*${regexLowRate.source}).*$`
    },
    {
      name: "🐢低倍率节点",
      type: "select",
      "include-all": true,
      filter: `(?i)${regexLowRate.source}`
    },
    
    // --- 自动测速池 ---
    Object.assign({}, baseUT, { name: "🔋♻️自动选择", "include-all": true, filter: `(?i)^(?=.*${regexHighQuality.source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇭🇰香港节点", "include-all": true, filter: `(?i)^(?=.*${regexHighQuality.source})(?=.*${regexRegions["香港"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇹🇼台湾节点", "include-all": true, filter: `(?i)^(?=.*${regexHighQuality.source})(?=.*${regexRegions["台湾"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇯🇵日本节点", "include-all": true, filter: `(?i)^(?=.*${regexHighQuality.source})(?=.*${regexRegions["日本"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇺🇸美国节点", "include-all": true, filter: `(?i)^(?=.*${regexHighQuality.source})(?=.*${regexRegions["美国"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇸🇬新加坡节点", "include-all": true, filter: `(?i)^(?=.*${regexHighQuality.source})(?=.*${regexRegions["新加坡"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇰🇷韩国节点", "include-all": true, filter: `(?i)^(?=.*${regexHighQuality.source})(?=.*${regexRegions["韩国"].source})(?!.*${regexLowRate.source}).*$` }),

    Object.assign({}, baseUT, { name: "🪫♻️自动选择", "include-all": true, filter: `(?i)^(?=.*${regexLowQuality.source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇭🇰香港节点", "include-all": true, filter: `(?i)^(?=.*${regexLowQuality.source})(?=.*${regexRegions["香港"].source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇹🇼台湾节点", "include-all": true, filter: `(?i)^(?=.*${regexLowQuality.source})(?=.*${regexRegions["台湾"].source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇯🇵日本节点", "include-all": true, filter: `(?i)^(?=.*${regexLowQuality.source})(?=.*${regexRegions["日本"].source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇺🇸美国节点", "include-all": true, filter: `(?i)^(?=.*${regexLowQuality.source})(?=.*${regexRegions["美国"].source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇸🇬新加坡节点", "include-all": true, filter: `(?i)^(?=.*${regexLowQuality.source})(?=.*${regexRegions["新加坡"].source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇰🇷韩国节点", "include-all": true, filter: `(?i)^(?=.*${regexLowQuality.source})(?=.*${regexRegions["韩国"].source}).*$` })
  ];

  // ============================================================================
  // 4. 外部规则：AI、Crypto，以及 217heidai 的集成净化规则
  // ============================================================================
  config["rule-providers"] = {
    AI: {
      type: "http",
      behavior: "classical",
      format: "yaml",
      path: "./ruleset/ai-vpsdance.yaml",
      url: "https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/clash/global.yaml",
      interval: 86400
    },
    Crypto: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      path: "./ruleset/crypto-666os.mrs",
      url: "https://cdn.jsdelivr.net/gh/666OS/rules@release/mihomo/domain/Crypto.mrs",
      interval: 86400
    },
    AdBlock: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      path: "./ruleset/adblock-217heidai.mrs",
      url: "https://cdn.jsdelivr.net/gh/217heidai/adblockfilters@main/rules/adblockmihomo.mrs",
      interval: 86400
    }
  };

  config.rules = [
    // 净化
    "RULE-SET,AdBlock,🍃净化拦截",
    // 按需阻断非中国大陆 UDP/443（主要是 QUIC）；取消下一行注释后启用
    //"AND,((DST-PORT,443),(NETWORK,UDP),(NOT,((GEOIP,CN)))),🍃净化拦截",

    // 私有网络直连：精确规则，可前置
    "GEOSITE,private,🎯全球直连",
    "GEOIP,private,🎯全球直连,no-resolve",

    // 人工智能：AI Provider 为 classical，内含域名、进程名，以及带 no-resolve 的 IP/ASN
    "DOMAIN-SUFFIX,openevidence.com,🤖人工智能",
    "GEOSITE,apple-intelligence,🤖人工智能",
    "RULE-SET,AI,🤖人工智能",

    // Crypto
    "RULE-SET,Crypto,🪙Crypto",

    // 油管视频
    "GEOSITE,youtube,📺油管视频",

    // 社交平台
    "GEOSITE,telegram,📲社交平台",
    "GEOIP,telegram,📲社交平台,no-resolve",
    "GEOSITE,category-social-media-!cn,📲社交平台",
    "GEOSITE,category-communication,📲社交平台",
    "GEOIP,facebook,📲社交平台,no-resolve",
    "GEOIP,twitter,📲社交平台,no-resolve",

    // 国际媒体
    "GEOSITE,category-entertainment,🍿国际媒体",
    "GEOIP,netflix,🍿国际媒体,no-resolve",

    // 游戏平台（游戏服务、商店及游戏下载/更新）
    "GEOSITE,category-game-platforms-download@cn,🎯全球直连",
    "GEOSITE,category-games-!cn,🎮游戏平台",
    "GEOSITE,category-game-platforms-download,🎮游戏平台",

    // 谷歌服务
    "GEOSITE,google,🇬谷歌服务",
    "GEOIP,google,🇬谷歌服务,no-resolve",

    // 微软服务
    "GEOSITE,microsoft@cn,🎯全球直连",
    "GEOSITE,microsoft,Ⓜ️微软服务",

    // 苹果服务
    "GEOSITE,apple-cn,🎯全球直连",
    "GEOSITE,apple,🍎苹果服务",
    "GEOIP,apple,🍎苹果服务,no-resolve",

    // 中国大陆通用兜底：宽泛规则置于各专用业务规则之后
    "GEOSITE,cn,🎯全球直连",
    "GEOIP,CN,🎯全球直连,no-resolve",

    // 漏网之鱼
    "MATCH,🐟漏网之鱼"
  ];

  return config;
}
