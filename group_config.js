function main(config) {
  // ============================================================================
  // 1. 核心系统参数注入
  // ============================================================================
  config["port"] = 7890;
  config["socks-port"] = 7891;
  config["redir-port"] = 7892;
  config["mixed-port"] = 7893;
  config["allow-lan"] = true;
  config["bind-address"] = "*";
  config["unified-delay"] = true;
  config["mode"] = "rule";
  config["log-level"] = "info";
  config["ipv6"] = false;
  config["tcp-concurrent"] = false;
  config["external-controller"] = "127.0.0.1:9090";

  config["experimental"] = {
    "ignore-resolve-fail": true,
    "quic-go-disable-gso": true
  };

  config["sniffer"] = {
    "enable": true,
    "override-destination": false,
    "sniff": {
      "HTTP": { "ports": [80, "8080-8880"], "override-destination": true },
      "TLS": { "ports": [443, 8443], "override-destination": true },
      "QUIC": { "ports": [443, 8443] }
    },
    "skip-domain": ["Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com"]
  };

  config["dns"] = {
    "enable": true,
    "ipv6": false,
    "listen": "0.0.0.0:1053",
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "respect-rules": true,
    "use-hosts": false,
    "use-system-hosts": false,
    "default-nameserver": ["223.5.5.5", "119.29.29.29", "180.184.1.1"],
    "nameserver": ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"],
    "nameserver-policy": {
      "geosite:cn": ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"]
    },
    "proxy-server-nameserver": ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
    "direct-nameserver": ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
    "direct-nameserver-follow-policy": true,
    "fake-ip-filter": [
      "rule-set:Direct","rule-set:Private","rule-set:China",
      "+.miwifi.com","+.docker.io","+.market.xiaomi.com","+.push.apple.com","+.stun.*","stun.*.*"
    ]
  };

  // ============================================================================
  // 2. 高性能正则匹配引擎
  // ============================================================================
  const regexLowRate = /(?:0\.[1-8](?:[xX]|倍)|[xX]0\.[1-8]|低倍率|省流|实验性|免费|test|beta)/iu;
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
  const baseUT = { type: "url-test", interval: 300, tolerance: 50, timeout: 2000, "expected-status": "204", lazy: false, url: "https://www.google.com/generate_204", hidden: true };
  const baseFB = { type: "fallback", interval: 300, timeout: 2000, "expected-status": "204", lazy: false, url: "https://www.google.com/generate_204", hidden: false };

  config["proxy-groups"] = [
    {
      name: "🚦节点选择",
      type: "select",
      proxies: [
        "🔋♻️自动选择",
        "🔋🛟故障转移",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "👆手动选择",
        "🪫♻️自动选择",
        "🪫🛟故障转移",
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
        "🔋🛟故障转移",
        "🔋🇯🇵日本节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🛟故障转移",
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
        "🚦节点选择",
        "👆手动选择",
        "🔋♻️自动选择",
        "🔋🛟故障转移",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🛟故障转移",
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
        "🔋🛟故障转移",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🛟故障转移",
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
      name: "Ⓜ️微软服务",
      type: "select",
      proxies: [
        "🤖人工智能",
        "🚦节点选择",
        "👆手动选择",
        "🎯全球直连",
        "🔋♻️自动选择",
        "🔋🛟故障转移",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🛟故障转移",
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
      name: "🎵Spotify",
      type: "select",
      proxies: [
        "🪫🛟故障转移",
        "🔋🛟故障转移",
        "🚦节点选择",
        "👆手动选择",
        "🐢低倍率节点",
        "🎯全球直连", 
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🔋♻️自动选择",
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
      name: "📺油管视频",
      type: "select",
      proxies: [
        "🪫🛟故障转移",
        "🔋🛟故障转移",
        "🚦节点选择",
        "👆手动选择",
        "🐢低倍率节点",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🔋♻️自动选择",
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
      name: "📲电报消息",
      type: "select",
      proxies: [
        "🔋♻️自动选择",
        "🪫♻️自动选择",
         "🚦节点选择",
        "👆手动选择",
        "🔋🛟故障转移",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫🛟故障转移",
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
      name: "📲社交平台",
      type: "select",
      proxies: [
        "🔋♻️自动选择",
        "🪫♻️自动选择",
         "🚦节点选择",
        "👆手动选择",
        "🔋🛟故障转移",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫🛟故障转移",
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
      name: "🎥奈飞视频",
      type: "select",
      proxies: [
        "🪫🛟故障转移",
        "🔋🛟故障转移",
        "🚦节点选择",
        "👆手动选择",
        "🐢低倍率节点",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🔋♻️自动选择",
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
      name: "🍿国际媒体",
      type: "select",
      proxies: [
        "🪫🛟故障转移",
        "🔋🛟故障转移",
        "🚦节点选择",
        "👆手动选择",
        "🐢低倍率节点",
        "🪫♻️自动选择",
        "🪫🇯🇵日本节点",
        "🪫🇺🇸美国节点",
        "🪫🇭🇰香港节点",
        "🪫🇹🇼台湾节点",
        "🪫🇸🇬新加坡节点",
        "🪫🇰🇷韩国节点",
        "🪫🧊冷门节点",
        "🔋♻️自动选择",
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
      name: "🍎苹果服务",
      type: "select",
      proxies: [
        "🎯全球直连",
        "🚦节点选择",
        "👆手动选择",
        "🔋♻️自动选择",
        "🔋🛟故障转移",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🛟故障转移",
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
        "🔋🛟故障转移",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🛟故障转移",
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
        "🔋🛟故障转移",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🛟故障转移",
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
        "🔋🛟故障转移",
        "🔋🇯🇵日本节点",
        "🔋🇺🇸美国节点",
        "🔋🇭🇰香港节点",
        "🔋🇹🇼台湾节点",
        "🔋🇸🇬新加坡节点",
        "🔋🇰🇷韩国节点",
        "🔋🧊冷门节点",
        "🪫♻️自动选择",
        "🪫🛟故障转移",
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
      name: "🍃应用净化",
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
      filter: `^(?=.*${regexHighQuality.source})(?!.*${regexMainRegions.source})(?!.*${regexLowRate.source}).*$`
    },
    {
      name: "🪫🧊冷门节点",
      type: "select",
      "include-all": true,
      filter: `^(?=.*${regexLowQuality.source})(?!.*${regexMainRegions.source})(?!.*${regexLowRate.source}).*$`
    },
    {
      name: "🐢低倍率节点",
      type: "select",
      "include-all": true,
      filter: `(?i)${regexLowRate.source}`
    },
    
    Object.assign({}, baseFB, { name: "🔋🛟故障转移", proxies: ["🔋🇯🇵日本节点", "🔋🇹🇼台湾节点", "🔋🇺🇸美国节点", "🔋🇭🇰香港节点", "🔋🇰🇷韩国节点", "🔋🇸🇬新加坡节点","🔋🧊冷门节点",] }),
    Object.assign({}, baseFB, { name: "🪫🛟故障转移", proxies: ["🪫🇯🇵日本节点", "🪫🇹🇼台湾节点", "🪫🇺🇸美国节点", "🪫🇭🇰香港节点", "🪫🇰🇷韩国节点", "🪫🇸🇬新加坡节点","🪫🧊冷门节点",] }),
    // --- 自动测速池 ---
    Object.assign({}, baseUT, { name: "🔋♻️自动选择", "include-all": true, filter: `^(?=.*${regexHighQuality.source})(?!.*${regexLowRate.source}).*$` }),
    //Object.assign({}, baseFB, { name: "🔋🛟故障转移", "include-all": true, filter: `^(?=.*${regexHighQuality.source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇭🇰香港节点", "include-all": true, filter: `^(?=.*${regexHighQuality.source})(?=.*${regexRegions["香港"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇹🇼台湾节点", "include-all": true, filter: `^(?=.*${regexHighQuality.source})(?=.*${regexRegions["台湾"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇯🇵日本节点", "include-all": true, filter: `^(?=.*${regexHighQuality.source})(?=.*${regexRegions["日本"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇺🇸美国节点", "include-all": true, filter: `^(?=.*${regexHighQuality.source})(?=.*${regexRegions["美国"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇸🇬新加坡节点", "include-all": true, filter: `^(?=.*${regexHighQuality.source})(?=.*${regexRegions["新加坡"].source})(?!.*${regexLowRate.source}).*$` }),
    Object.assign({}, baseUT, { name: "🔋🇰🇷韩国节点", "include-all": true, filter: `^(?=.*${regexHighQuality.source})(?=.*${regexRegions["韩国"].source})(?!.*${regexLowRate.source}).*$` }),

    Object.assign({}, baseUT, { name: "🪫♻️自动选择", "include-all": true, filter: `^(?=.*${regexLowQuality.source}).*$` }),
    //Object.assign({}, baseFB, { name: "🪫🛟故障转移", "include-all": true, filter: `^(?=.*${regexLowQuality.source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇭🇰香港节点", "include-all": true, filter: `^(?=.*${regexLowQuality.source})(?=.*${regexRegions["香港"].source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇹🇼台湾节点", "include-all": true, filter: `^(?=.*${regexLowQuality.source})(?=.*${regexRegions["台湾"].source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇯🇵日本节点", "include-all": true, filter: `^(?=.*${regexLowQuality.source})(?=.*${regexRegions["日本"].source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇺🇸美国节点", "include-all": true, filter: `^(?=.*${regexLowQuality.source})(?=.*${regexRegions["美国"].source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇸🇬新加坡节点", "include-all": true, filter: `^(?=.*${regexLowQuality.source})(?=.*${regexRegions["新加坡"].source}).*$` }),
    Object.assign({}, baseUT, { name: "🪫🇰🇷韩国节点", "include-all": true, filter: `^(?=.*${regexLowQuality.source})(?=.*${regexRegions["韩国"].source}).*$` })
  ];

  // ============================================================================
  // 4. 规则提供者
  // ============================================================================
  const behaviorDN = { type: "http", behavior: "domain", format: "mrs", interval: 86400 };
  const behaviorIP = { type: "http", behavior: "ipcidr", format: "mrs", interval: 86400 };

  if (!config['rule-providers']) config['rule-providers'] = {};

  Object.assign(config["rule-providers"], {
    Tracking: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Tracking.mrs" }),
    Advertising: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Advertising.mrs" }),
    Direct: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Direct.mrs" }),
    Private: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Private.mrs" }),
    AI: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/AI.mrs" }),
    Telegram: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Telegram.mrs" }),
    SocialMedia: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/SocialMedia.mrs" }),
    NewsMedia: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/NewsMedia.mrs" }),
    Games: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Games.mrs" }),
    Crypto: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Crypto.mrs" }),
    Spotify: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Spotify.mrs" }),
    Netflix: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Netflix.mrs" }),
    YouTube: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/YouTube.mrs" }),
    XPTV: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/XPTV.mrs" }),
    Emby: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Emby.mrs" }),
    Streaming: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Streaming.mrs" }),
    AppleCN: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/AppleCN.mrs" }),
    Apple: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Apple.mrs" }),
    Google: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Google.mrs" }),
    Microsoft: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Microsoft.mrs" }),
    Proxy: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/Proxy.mrs" }),
    China: Object.assign({}, behaviorDN, { url: "https://github.com/666OS/rules/raw/release/mihomo/domain/China.mrs" }),

    AdvertisingIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/Advertising.mrs" }),
    PrivateIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/Private.mrs" }),
    AIIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/AI.mrs" }),
    TelegramIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/Telegram.mrs" }),
    SocialMediaIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/SocialMedia.mrs" }),
    XPTVIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/XPTV.mrs" }),
    EmbyIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/Emby.mrs" }),
    NetflixIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/Netflix.mrs" }),
    StreamingIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/Streaming.mrs" }),
    GoogleIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/Google.mrs" }),
    ProxyIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/Proxy.mrs" }),
    ChinaIP: Object.assign({}, behaviorIP, { url: "https://github.com/666OS/rules/raw/release/mihomo/ip/China.mrs" })
  });

  // ============================================================================
  // 5. 路由规则注入
  // ============================================================================
  config["rules"] = [
    "RULE-SET,Tracking,🍃应用净化",
    "RULE-SET,Advertising,🍃应用净化",
    //"AND,((DST-PORT,443),(NETWORK,UDP),(NOT,((GEOIP,CN)))),🍃应用净化",

    "RULE-SET,Private,🎯全球直连",
    "RULE-SET,Direct,🎯全球直连",
    "RULE-SET,XPTV,🎯全球直连",
    "RULE-SET,AppleCN,🎯全球直连",
    "RULE-SET,AI,🤖人工智能",
    "RULE-SET,Crypto,🪙Crypto",
    "RULE-SET,Telegram,📲电报消息",
    "RULE-SET,SocialMedia,📲社交平台",
    "RULE-SET,Emby,🍿国际媒体",
    "RULE-SET,Netflix,🎥奈飞视频",
    "RULE-SET,Spotify,🎵Spotify",
    "RULE-SET,YouTube,📺油管视频",
    "RULE-SET,Streaming,🍿国际媒体",
    "RULE-SET,Games,🎮游戏平台",
    "RULE-SET,Google,🇬谷歌服务",
    "RULE-SET,Microsoft,Ⓜ️微软服务",
    "RULE-SET,Apple,🍎苹果服务",
    "RULE-SET,NewsMedia,🚦节点选择",
    "RULE-SET,Proxy,🚦节点选择",
    "RULE-SET,China,🎯全球直连",

    "RULE-SET,AdvertisingIP,🍃应用净化,no-resolve",
    "RULE-SET,PrivateIP,🎯全球直连,no-resolve",
    "RULE-SET,XPTVIP,🎯全球直连,no-resolve",
    "RULE-SET,AIIP,🤖人工智能,no-resolve",
    "RULE-SET,TelegramIP,📲电报消息,no-resolve",
    "RULE-SET,SocialMediaIP,📲社交平台,no-resolve",
    "RULE-SET,EmbyIP,🍿国际媒体,no-resolve",
    "RULE-SET,NetflixIP,🎥奈飞视频,no-resolve",
    "RULE-SET,StreamingIP,🍿国际媒体,no-resolve",
    "RULE-SET,GoogleIP,🇬谷歌服务,no-resolve",
    "RULE-SET,ProxyIP,🚦节点选择,no-resolve",
    "RULE-SET,ChinaIP,🎯全球直连",

    "MATCH,🐟漏网之鱼"
  ];

  return config;
}
