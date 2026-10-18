// 更新：2026-10-16 22:44（UTC+8）；13 地区增强识别，全球补旗，支持 TAG、forceH/forceL、highRate/lowRate。
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
  // 2. 节点识别与标准化
  // ============================================================================
  // 2.1 地区表、别名与名称清理规则
  const FG = ["🇭🇰","🇲🇴","🇹🇼","🇯🇵","🇰🇵","🇰🇷","🇸🇬","🇺🇸","🇬🇧","🇫🇷","🇩🇪","🇦🇺","🇦🇪","🇦🇫","🇦🇱","🇩🇿","🇦🇴","🇦🇷","🇦🇲","🇦🇹","🇦🇿","🇧🇭","🇧🇩","🇧🇾","🇧🇪","🇧🇿","🇧🇯","🇧🇹","🇧🇴","🇧🇦","🇧🇼","🇧🇷","🇻🇬","🇧🇳","🇧🇬","🇧🇫","🇧🇮","🇰🇭","🇨🇲","🇨🇦","🇨🇻","🇰🇾","🇨🇫","🇹🇩","🇨🇱","🇨🇴","🇰🇲","🇨🇩","🇨🇬","🇨🇷","🇭🇷","🇨🇾","🇨🇿","🇩🇰","🇩🇯","🇩🇴","🇪🇨","🇪🇬","🇸🇻","🇬🇶","🇪🇷","🇪🇪","🇪🇹","🇫🇯","🇫🇮","🇬🇦","🇬🇲","🇬🇪","🇬🇭","🇬🇷","🇬🇱","🇬🇹","🇬🇼","🇬🇳","🇬🇾","🇭🇹","🇭🇳","🇭🇺","🇮🇸","🇮🇩","🇮🇳","🇮🇷","🇮🇶","🇮🇪","🇮🇲","🇮🇱","🇮🇹","🇨🇮","🇯🇲","🇯🇴","🇰🇿","🇰🇪","🇰🇼","🇰🇬","🇱🇦","🇱🇻","🇱🇧","🇱🇸","🇱🇷","🇱🇾","🇱🇹","🇱🇺","🇲🇰","🇲🇬","🇲🇼","🇲🇾","🇲🇻","🇸🇴","🇲🇱","🇲🇹","🇲🇷","🇲🇺","🇲🇽","🇲🇩","🇲🇨","🇲🇳","🇲🇪","🇲🇦","🇲🇿","🇲🇲","🇳🇦","🇳🇵","🇳🇱","🇳🇿","🇳🇮","🇳🇪","🇳🇬","🇳🇴","🇴🇲","🇵🇰","🇵🇦","🇵🇾","🇵🇪","🇵🇭","🇵🇹","🇵🇷","🇶🇦","🇷🇴","🇷🇺","🇷🇼","🇸🇲","🇸🇦","🇸🇳","🇷🇸","🇸🇱","🇸🇰","🇸🇮","🇿🇦","🇪🇸","🇱🇰","🇸🇩","🇸🇷","🇸🇿","🇸🇪","🇨🇭","🇸🇾","🇹🇯","🇹🇿","🇹🇭","🇹🇬","🇹🇴","🇹🇹","🇹🇳","🇹🇷","🇹🇲","🇻🇮","🇺🇬","🇺🇦","🇺🇾","🇺🇿","🇻🇪","🇻🇳","🇾🇪","🇿🇲","🇿🇼","🇦🇩","🇷🇪","🇵🇱","🇬🇺","🇻🇦","🇱🇮","🇨🇼","🇸🇨","🇦🇶","🇬🇮","🇨🇺","🇫🇴","🇦🇽","🇧🇲","🇹🇱"];
  // prettier-ignore
  const ZH = ["香港","澳门","台湾","日本","朝鲜","韩国","新加坡","美国","英国","法国","德国","澳大利亚","阿联酋","阿富汗","阿尔巴尼亚","阿尔及利亚","安哥拉","阿根廷","亚美尼亚","奥地利","阿塞拜疆","巴林","孟加拉国","白俄罗斯","比利时","伯利兹","贝宁","不丹","玻利维亚","波斯尼亚和黑塞哥维那","博茨瓦纳","巴西","英属维京群岛","文莱","保加利亚","布基纳法索","布隆迪","柬埔寨","喀麦隆","加拿大","佛得角","开曼群岛","中非共和国","乍得","智利","哥伦比亚","科摩罗","刚果(金)","刚果(布)","哥斯达黎加","克罗地亚","塞浦路斯","捷克","丹麦","吉布提","多米尼加共和国","厄瓜多尔","埃及","萨尔瓦多","赤道几内亚","厄立特里亚","爱沙尼亚","埃塞俄比亚","斐济","芬兰","加蓬","冈比亚","格鲁吉亚","加纳","希腊","格陵兰","危地马拉","几内亚比绍","几内亚","圭亚那","海地","洪都拉斯","匈牙利","冰岛","印尼","印度","伊朗","伊拉克","爱尔兰","马恩岛","以色列","意大利","科特迪瓦","牙买加","约旦","哈萨克斯坦","肯尼亚","科威特","吉尔吉斯斯坦","老挝","拉脱维亚","黎巴嫩","莱索托","利比里亚","利比亚","立陶宛","卢森堡","马其顿","马达加斯加","马拉维","马来西亚","马尔代夫","索马里","马里","马耳他","毛利塔尼亚","毛里求斯","墨西哥","摩尔多瓦","摩纳哥","蒙古","黑山共和国","摩洛哥","莫桑比克","缅甸","纳米比亚","尼泊尔","荷兰","新西兰","尼加拉瓜","尼日尔","尼日利亚","挪威","阿曼","巴基斯坦","巴拿马","巴拉圭","秘鲁","菲律宾","葡萄牙","波多黎各","卡塔尔","罗马尼亚","俄罗斯","卢旺达","圣马力诺","沙特阿拉伯","塞内加尔","塞尔维亚","塞拉利昂","斯洛伐克","斯洛文尼亚","南非","西班牙","斯里兰卡","苏丹","苏里南","斯威士兰","瑞典","瑞士","叙利亚","塔吉克斯坦","坦桑尼亚","泰国","多哥","汤加","特立尼达和多巴哥","突尼斯","土耳其","土库曼斯坦","美属维尔京群岛","乌干达","乌克兰","乌拉圭","乌兹别克斯坦","委内瑞拉","越南","也门","赞比亚","津巴布韦","安道尔","留尼汪","波兰","关岛","梵蒂冈","列支敦士登","库拉索","塞舌尔","南极","直布罗陀","古巴","法罗群岛","奥兰群岛","百慕达","东帝汶"];
  // prettier-ignore
  const QC = ["Hong Kong","Macao","Taiwan","Japan","North Korea","Korea","Singapore","United States","United Kingdom","France","Germany","Australia","United Arab Emirates","Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Cayman Islands","Central African Republic","Chad","Chile","Colombia","Comoros","Congo-Kinshasa","Congo-Brazzaville","Costa Rica","Croatia","Cyprus","Czech Republic","Denmark","Djibouti","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Ethiopia","Fiji","Finland","Gabon","Gambia","Georgia","Ghana","Greece","Greenland","Guatemala","Guinea-Bissau","Guinea","Guyana","Haiti","Honduras","Hungary","Iceland","Indonesia","India","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Ivory Coast","Jamaica","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Lithuania","Luxembourg","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Somalia","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar (Burma)","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","Norway","Oman","Pakistan","Panama","Paraguay","Peru","Philippines","Portugal","Puerto Rico","Qatar","Romania","Russia","Rwanda","San Marino","Saudi Arabia","Senegal","Serbia","Sierra Leone","Slovakia","Slovenia","South Africa","Spain","Sri Lanka","Sudan","Suriname","Eswatini","Sweden","Switzerland","Syria","Tajikistan","Tanzania","Thailand","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","U.S. Virgin Islands","Uganda","Ukraine","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe","Andorra","Reunion","Poland","Guam","Vatican","Liechtenstein","Curacao","Seychelles","Antarctica","Gibraltar","Cuba","Faroe Islands","Aland Islands","Bermuda","Timor-Leste"];
  
  
  // 地区代码兜底
  // 完整名称表未命中才执行；仅保留明确代码和少量常用别名。
  // 英文代码有字母边界，允许 JP01；移除 GB（流量单位）、IN/IT/LA（常见词或歧义）。
  const rurekey = {
      "香港": /(?<![a-zA-Z])(?:HK|HKG|HKBN)(?![a-zA-Z])|(?<![\u4e00-\u9fa5])港(?![\u4e00-\u9fa5])/i,
      "台湾": /新北|彰化|台北|臺北|(?<![a-zA-Z])(?:TW|TWN|Taipei|TPE|TSA|KHH)(?![a-zA-Z])/i,
      "日本": /东京|東京|大[阪坂]|埼玉|(?<![a-zA-Z])(?:JP|JPN|Tokyo|Osaka|NRT|HND|KIX|CTS|FUK)(?![a-zA-Z])/i,
      "美国": /波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|哥伦布|纽约|(?<![a-zA-Z])(?:US|USA|Los[\s_-]*Angeles|San[\s_-]*Jose|Silicon[\s_-]*Valley|Michigan|ATL|BUF|DFW|EWR|IAD|JFK|LAX|MCI|MIA|ORD|PDX|PHX|SEA|SFO|SJC)(?![a-zA-Z])/i,
      "韩国": /首尔|首爾|春川|(?<![a-zA-Z])(?:KR|KOR|Seoul|Chuncheon|ICN)(?![a-zA-Z])/i,
      "新加坡": /(?<![a-zA-Z])(?:SG|SGP|SIN|XSP)(?![a-zA-Z])/i,
      "英国": /伦敦|倫敦|(?<![a-zA-Z])(?:UK|London|LHR)(?![a-zA-Z])/i,
      "德国": /法兰克福|法蘭克福|慕尼黑|(?<![a-zA-Z])(?:DE|Frankfurt|Munich|FRA|MUC)(?![a-zA-Z])/i,
      "法国": /巴黎|(?<![a-zA-Z])(?:FR|Paris|CDG)(?![a-zA-Z])/i,
      "澳大利亚": /悉尼|墨尔本|墨爾本|(?<![a-zA-Z])(?:AU|Sydney|Melbourne|SYD|MEL)(?![a-zA-Z])/i,
      "加拿大": /温哥华|溫哥華|多伦多|多倫多|(?<![a-zA-Z])(?:CA|Vancouver|Toronto|YVR|YYZ)(?![a-zA-Z])/i,
      "澳门": /(?<![a-zA-Z])(?:MO|MFM)(?![a-zA-Z])/i,
      "越南": /河内|河內|胡志明|(?<![a-zA-Z])(?:VN|Hanoi|Ho[\s_-]*Chi[\s_-]*Minh|SGN|HAN)(?![a-zA-Z])/i
  };
  
  
  // 地区别名与名称精简
  const compactRegions = {
      "美国": ["美国", "美國", "美利坚合众国", "美利堅合眾國", "美利坚", "美利堅", "America", "United States of America", "United States"],
      "德国": ["德国", "德國", "德意志", "Germany"],
      "加拿大": ["加拿大", "Canada"],
      "新加坡": ["新加坡", "狮城", "獅城", "星加坡", "星洲", "Singapore"],
      "日本": ["日本", "Japan"],
      "台湾": ["台湾", "臺灣", "台灣", "Taiwan"],
      "香港": ["香港", "Hong Kong"],
      "澳门": ["澳门", "澳門", "Macao", "Macau"],
      "韩国": ["韩国", "韓國", "南韩", "南韓", "大韩民国", "大韓民國", "Republic of Korea", "South Korea", "Korea"],
      "越南": ["越南", "Vietnam"],
      "英国": ["英国", "英國", "England", "Britain", "United Kingdom", "Great Britain"],
      "法国": ["法国", "法國", "法兰西", "法蘭西", "France"],
      "澳大利亚": ["澳大利亚", "澳大利亞", "澳洲", "Australia"]
  };
  const escapeRegex = text => text.replace(/[.*+?^\x24{}()|[\]\\]/g, "\\$&");
  function aliasSource(alias) {
      if (!/[a-zA-Z]/.test(alias)) return escapeRegex(alias);
      // 洲名与 New England 不作为美国、英国的名称识别或删除。
      const guard = alias === "America"
          ? "(?<!\\b(?:North|South|Central|Latin)[\\s_-]*)"
          : alias === "England" ? "(?<!\\bNew[\\s_-]*)" : "";
      return guard + escapeRegex(alias).replace(/ +/g, "[\\s_-]*") + "(?![a-zA-Z])";
  }
  // 别名归入所属地区；主表命中即返回，不执行增强规则。
  const regionAliases = {
      ...compactRegions,
      "泰国": ["泰國"],
      "英国": [...compactRegions["英国"], "北爱尔兰", "北愛爾蘭", "Northern Ireland"],
      "印尼": ["印尼", "印度尼西亚", "印度尼西亞"],
      "朝鲜": ["朝鲜", "朝鮮", "North Korea"],
      "韩国": [...compactRegions["韩国"], "南朝鲜", "南朝鮮", "South Korea"],
      "阿联酋": ["阿联酋", "阿聯酋", "阿拉伯联合酋长国", "迪拜", "Dubai"],
      "刚果(金)": ["刚果民主共和国", "Democratic Republic of the Congo"],
      "刚果(布)": ["刚果共和国", "Republic of the Congo"]
  };
  const regionPatterns = ZH.map((name, index) => new RegExp(
      [...new Set([name, QC[index], ...(regionAliases[name] || [])])].map(alias =>
          (/[a-zA-Z]/.test(alias) ? "(?<![a-zA-Z])" : name === "朝鲜" ? "(?<!南)" : "") + aliasSource(alias)
      ).join("|"), "iu"));
  const chineseFieldBoundary = "[\\s|/\\\\,，;；:：·_()（）\\[\\]【】{}\\-]";
  const compactPatterns = Object.fromEntries(
      Object.entries(compactRegions).map(([region, aliases]) => {
          const words = aliases.map(aliasSource).join("|");
          return [region, {
              prefix: new RegExp("^\\s*(?:" + words + ")", "iu"),
              field: new RegExp("(^|" + chineseFieldBoundary + ")(?:" + words +
                  ")(?=$|" + chineseFieldBoundary + ")", "giu")
          }];
      })
  );
  
  function identifyRegion(name) {
      const flags = FG.filter(flag => name.includes(flag));
      if (flags.length === 1) return FG.indexOf(flags[0]);
      const index = regionPatterns.findIndex(pattern => pattern.test(name));
      if (index >= 0) return index;
      // 增强文字只有唯一地区时才采用；多国旗无明确文字时取原名中的第一面。
      const matches = Object.entries(rurekey).filter(([, regex]) => regex.test(name));
      if (matches.length === 1) return ZH.indexOf(matches[0][0]);
      return flags.length > 1
          ? FG.indexOf(flags.sort((a, b) => name.indexOf(a) - name.indexOf(b))[0]) : -1;
  }
  
  
  // ============================================================================
  // 2.2 地区分组与独立质量判断
  // ============================================================================
  // 参数名不区分大小写；tag 默认 L；force 支持英文逗号、中文逗号和顿号。
  const settings = {
    tag: "L",
    forceH: "",
    forceL: "",
    highRate: "",
    lowRate: ""
  };
  // 可直接编辑 settings；Sub-Store 的 $arguments 覆盖本地设置。
  const args = Object.fromEntries(Object.entries({ ...settings, ...(typeof $arguments !== "undefined" && $arguments ? $arguments : {}) })
    .map(([key, value]) => [key.toLowerCase(), value]));
  function readArgument(key) {
    const text = String(args[key.toLowerCase()] ?? "");
    try { return decodeURIComponent(text); } catch { return text; }
  }
  function readRate(key) {
    const text = readArgument(key).trim();
    if (!text) return null;
    const value = Number(text);
    if (!Number.isFinite(value) || value < 0) throw new Error(key + " 必须是有限的非负数值");
    return value;
  }
  const baseQuality = readArgument("tag").trim().toUpperCase() === "H" ? "⬢" : "";
  const highRate = readRate("highRate"), lowRate = readRate("lowRate");
  if ((lowRate ?? 1) > (highRate ?? 1) || (lowRate !== null && highRate !== null && lowRate === highRate)) {
    throw new Error("highRate 与 lowRate 的判定区间不能重叠");
  }
  // 未填阈值使用 >1 / <1，填写后使用 >= / <=。
  const forceH = readArgument("forceH").split(/[,，、]/).map(s => s.trim().toUpperCase()).filter(Boolean);
  const forceL = readArgument("forceL").split(/[,，、]/).map(s => s.trim().toUpperCase()).filter(Boolean);
  const regexHighQuality = /^⬢/u;

  const regionData = {
    "香港": { emoji: "🇭🇰" },
    "台湾": { emoji: "🇹🇼" },
    "新加坡": { emoji: "🇸🇬" },
    "韩国": { emoji: "🇰🇷" },
    "日本": { emoji: "🇯🇵" },
    "美国": { emoji: "🇺🇸" },
  };

  // 标准化之后只按主国旗分组，不再次猜测地区。
  const regexRegions = {};
  for (const [region, data] of Object.entries(regionData)) {
    regexRegions[region] = new RegExp("^⬢?" + data.emoji, "u");
  }

  const multiplierRegex = /(?<![a-zA-Z\d.])(?:(\d+(?:\.\d+)?)\s*(?:[x×倍])(?![a-zA-Z\d.])|[x×]\s*(\d+(?:\.\d+)?)(?![a-zA-Z\d.]))/giu;
  // 保留原版低档关键词；只移除计费数字的一位小数限制。
  const lowQualityKeywords = /低倍率|省流|实验性|免费|(?<![a-zA-Z])(?:test|beta)(?![a-zA-Z])/i;
  const highQualityKeywords = /家宽|家寬|住宅|(?<![a-zA-Z])(?:ISP|Residential)(?![a-zA-Z])/i;
  
  
  function classifyQuality(name) {
    const upperName = name.toUpperCase();
    if (forceH.some(keyword => upperName.includes(keyword))) return "⬢";
    if (forceL.some(keyword => upperName.includes(keyword))) return "";
    if (lowQualityKeywords.test(name)) return "";
    const rates = [...name.matchAll(multiplierRegex)].map(match => Number(match[1] || match[2]));
    if (rates.length) {
      const rate = Math.min(...rates);
      if (lowRate === null ? rate < 1 : rate <= lowRate) return "";
      if (highRate === null ? rate > 1 : rate >= highRate) return "⬢";
    }
    return highQualityKeywords.test(name) ? "⬢" : baseQuality;
  }

  // 2.3 节点名称清理、去重与引用同步
  const flagRegex = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;
  const decorativeEmoji = /\p{Extended_Pictographic}[\uFE0E\uFE0F]?|[0-9#*]\uFE0F?\u20E3/gu;
  const keepEmoji = /^(?:[0-9]\uFE0F?\u20E3|[Ⓜ\u{1F130}-\u{1F149}\u{1F170}-\u{1F189}][\uFE0E\uFE0F]?)$/u;
  const usedNames = new Set();
  const nameCounts = new Map();
  const renamedNodes = new Map();
  (config.proxies || []).forEach((node, index) => {
    if (typeof node.name !== "string") return;
    const originalName = node.name;
    const sourceName = originalName.replace(/[⬢⬡]/gu, "");
    const regionIndex = identifyRegion(sourceName);
    const flag = FG[regionIndex] || "";
    const quality = classifyQuality(originalName);
    let body = sourceName.replace(decorativeEmoji, emoji => keepEmoji.test(emoji) ? emoji : "")
      .replace(/[\u{1F3FB}-\u{1F3FF}\u200D]/gu, "").replace(flagRegex, "");
    const patterns = compactPatterns[ZH[regionIndex]];
    if (flag && patterns) body = body.replace(patterns.prefix, "").replace(patterns.field, "$1");
    body = body.replace(/\s+/g, " ").trim();
    if (!body && !flag) body = "节点 " + (index + 1);
    const baseName = quality + [flag, body].filter(Boolean).join(" ");
    let count = nameCounts.get(baseName) || 0;
    let uniqueName = baseName + (count ? "#" + count : "");
    while (usedNames.has(uniqueName)) uniqueName = baseName + "#" + ++count;
    nameCounts.set(baseName, count + 1);
    usedNames.add(uniqueName);
    renamedNodes.set(originalName, uniqueName);
    node.name = uniqueName;
  });
  (config.proxies || []).forEach(node => {
    if (typeof node["dialer-proxy"] === "string" && renamedNodes.has(node["dialer-proxy"])) {
      node["dialer-proxy"] = renamedNodes.get(node["dialer-proxy"]);
    }
  });

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
  
  const regions = ["香港", "台湾", "日本", "美国", "新加坡", "韩国"];
  const regionGroups = regions.map(region => regionData[region].emoji + region + "节点");
  const regionalChoices = ["🇯🇵日本节点", "🇺🇸美国节点", "🇭🇰香港节点", "🇹🇼台湾节点", "🇸🇬新加坡节点", "🇰🇷韩国节点"];
  const preferred = "🌟优选节点";
  const cold = "🧊冷门节点";
  const allChoices = ["♻️自动选择", ...regionalChoices, preferred, cold];
  const nodes = config.proxies || [];
  const membersByPool = new Map();
  const poolsByRegion = new Map([...regionGroups, cold].map(name => [name, []]));
  const preferredPools = [];
  config["proxy-providers"] = { ...config["proxy-providers"] };

  // 每个节点只存一份；按地区和优选标记拆池，供地区、总自动和优选组共享。
  for (const node of nodes) {
    const region = regions.find(region => regexRegions[region].test(node.name));
    const group = region ? regionData[region].emoji + region + "节点" : cold;
    const isPreferred = regexHighQuality.test(node.name);
    const pool = "节点池/" + group + (isPreferred ? "/优选" : "/其他");
    if (!membersByPool.has(pool)) {
      membersByPool.set(pool, []);
      poolsByRegion.get(group).push(pool);
      if (isPreferred) preferredPools.push(pool);
    }
    membersByPool.get(pool).push(node);
  }
  for (const [name, payload] of membersByPool) {
    if (name in config["proxy-providers"]) throw new Error("节点池名称冲突：" + name);
    config["proxy-providers"][name] = {
      type: "inline", payload,
      "health-check": { ...probe, enable: true, interval: baseUT.interval, lazy: baseUT.lazy }
    };
  }
  // 被链式连接引用的节点保留全局名称。
  const dialerTargets = new Set(nodes.map(node => node["dialer-proxy"]));
  config.proxies = nodes.filter(node => dialerTargets.has(node.name));
  const poolRefs = use => use.length ? { use } : { proxies: ["REJECT"] };
  const select = (name, proxies, extra = {}) => {
    const group = { ...probe, name, type: "select", ...(proxies ? { proxies } : {}), ...extra };
    if (group["include-all"]) {
      delete group["include-all"];
      group.use = Object.keys(config["proxy-providers"]);
      if (!group.use.length && !group.proxies) group.proxies = ["REJECT"];
    }
    return group;
  };

  config["proxy-groups"] = [
    select("🚦节点选择", [...allChoices, "👆手动选择"], { "include-all": true }),
    select("👆手动选择", [...regionalChoices, preferred, cold], { "include-all": true }),
    select("🤖人工智能", [
      "🇺🇸美国节点", "🇯🇵日本节点", preferred, "🚦节点选择", "👆手动选择",
      "♻️自动选择", "🇹🇼台湾节点", "🇸🇬新加坡节点", "🇰🇷韩国节点", cold
    ], { "include-all": true, "exclude-filter": "(?i)" + regexRegions["香港"].source }),
    select("🪙Crypto", [
      "🇸🇬新加坡节点", "🇺🇸美国节点", "🇭🇰香港节点", "🇹🇼台湾节点",
      "🚦节点选择", "👆手动选择", "🇰🇷韩国节点", "🇯🇵日本节点",
      preferred, cold, "♻️自动选择", "🎯全球直连"
    ], { "include-all": true }),
    select("📺油管视频", ["♻️自动选择", "🚦节点选择", "👆手动选择", ...regionalChoices, preferred, cold]),
    select("📲社交平台", ["♻️自动选择", "🚦节点选择", "👆手动选择", ...regionalChoices, preferred, cold]),
    select("🍿国际媒体", ["♻️自动选择", "🚦节点选择", "👆手动选择", ...regionalChoices, preferred, cold]),
    select("🇬谷歌服务", ["🤖人工智能", "🚦节点选择", "👆手动选择", ...allChoices, "🎯全球直连"]),
    select("Ⓜ️微软服务", ["🤖人工智能", "🚦节点选择", "👆手动选择", "🎯全球直连", ...allChoices]),
    select("🍎苹果服务", ["🤖人工智能", "🎯全球直连", "🚦节点选择", "👆手动选择", ...allChoices]),
    select("🎮游戏平台", ["🎯全球直连", "🚦节点选择", "👆手动选择", ...allChoices]),
    select(preferred, null, { "empty-fallback": "REJECT", ...poolRefs(preferredPools) }),
    select(cold, null, { "empty-fallback": "REJECT", ...poolRefs(poolsByRegion.get(cold)) }),
    select("🎯全球直连", ["DIRECT", "👆手动选择", ...allChoices]),
    select("🐟漏网之鱼", ["🚦节点选择", "👆手动选择", "🎯全球直连", ...allChoices]),
    select("🍃净化拦截", ["REJECT", "DIRECT"]),

    // 总自动直接展开全部原始节点；地区组使用各自池，不嵌套地区出口。
    { ...baseUT, name: "♻️自动选择", ...poolRefs([...membersByPool.keys()]) },
    ...regionGroups.map(name => ({ ...baseUT, name, ...poolRefs(poolsByRegion.get(name)) }))
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
