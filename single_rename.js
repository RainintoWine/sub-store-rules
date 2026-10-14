/**
 * 节点打标与重命名：保留来源档次、倍率、线路与完整机场后缀。
 * tag=H/L、name、forceH、forceL；空 tag 默认 L，空 name 无后缀。
 * 原始订阅先识别/force，后清理名称；旧质量标记清除后重新判定。
 */

// ==========================================
// ⚙️ 1. 用户配置区 
// ==========================================
// 1. 全局基础档次 H -> ◆、L -> ◇；节点倍率与特征可覆盖，force 最终优先。
function readArgument(key) {
    const args = typeof $arguments !== "undefined" && $arguments ? $arguments : {};
    const actualKey = Object.prototype.hasOwnProperty.call(args, key)
        ? key : Object.keys(args).find(name => name.toLowerCase() === key.toLowerCase());
    const value = actualKey === undefined ? undefined : args[actualKey];
    if (value === undefined || value === null) return "";
    const text = String(value);
    try { return decodeURIComponent(text); } catch { return text; }
}
const rawTag = readArgument("tag").trim().toUpperCase() || "L";
const tagMap = { H: "◆", L: "◇" };
const QUALITY_TAG = tagMap[rawTag] || tagMap.L;

// 2. 机场名称后缀
const AIRPORT_NAME = readArgument("name");

// 3. 倍率按数值比较：>1 升级，<1 降级，=1 沿用基础档次。
// 接受中文紧邻倍率，拒绝英文单词、数字和小数内部的局部命中。
const multiplierRegex = /(?<![a-zA-Z\d.])(?:(\d+(?:\.\d+)?)\s*(?:[x×倍])(?![a-zA-Z\d.])|[x×]\s*(\d+(?:\.\d+)?)(?![a-zA-Z\d.]))/giu;
// 保留原版低档关键词；只移除计费数字的一位小数限制。
const lowQualityKeywords = /低倍率|省流|实验性|免费|(?<![a-zA-Z])(?:test|beta)(?![a-zA-Z])/i;
const highQualityKeywords = /家宽|家寬|住宅|(?<![a-zA-Z])(?:ISP|Residential)(?![a-zA-Z])/i;

// 4. 自定义关键字强制标记规则 (统一转大写，无视大小写的字面包含匹配；支持英文逗号、中文逗号、顿号)
const argForceH = readArgument("forceH");
const argForceL = readArgument("forceL");

const forceHList = argForceH ? argForceH.split(/[,，、]/).map(s => s.trim().toUpperCase()).filter(Boolean) : [];
const forceLList = argForceL ? argForceL.split(/[,，、]/).map(s => s.trim().toUpperCase()).filter(Boolean) : [];

// ==========================================
// 📦 2. 国旗、中英文地区名称逐项对应；只调整已核实的冲突顺序
// ==========================================
// prettier-ignore
const FG = ["🇭🇰","🇲🇴","🇹🇼","🇯🇵","🇰🇵","🇰🇷","🇸🇬","🇺🇸","🇬🇧","🇫🇷","🇩🇪","🇦🇺","🇦🇪","🇦🇫","🇦🇱","🇩🇿","🇦🇴","🇦🇷","🇦🇲","🇦🇹","🇦🇿","🇧🇭","🇧🇩","🇧🇾","🇧🇪","🇧🇿","🇧🇯","🇧🇹","🇧🇴","🇧🇦","🇧🇼","🇧🇷","🇻🇬","🇧🇳","🇧🇬","🇧🇫","🇧🇮","🇰🇭","🇨🇲","🇨🇦","🇨🇻","🇰🇾","🇨🇫","🇹🇩","🇨🇱","🇨🇴","🇰🇲","🇨🇩","🇨🇬","🇨🇷","🇭🇷","🇨🇾","🇨🇿","🇩🇰","🇩🇯","🇩🇴","🇪🇨","🇪🇬","🇸🇻","🇬🇶","🇪🇷","🇪🇪","🇪🇹","🇫🇯","🇫🇮","🇬🇦","🇬🇲","🇬🇪","🇬🇭","🇬🇷","🇬🇱","🇬🇹","🇬🇼","🇬🇳","🇬🇾","🇭🇹","🇭🇳","🇭🇺","🇮🇸","🇮🇩","🇮🇳","🇮🇷","🇮🇶","🇮🇪","🇮🇲","🇮🇱","🇮🇹","🇨🇮","🇯🇲","🇯🇴","🇰🇿","🇰🇪","🇰🇼","🇰🇬","🇱🇦","🇱🇻","🇱🇧","🇱🇸","🇱🇷","🇱🇾","🇱🇹","🇱🇺","🇲🇰","🇲🇬","🇲🇼","🇲🇾","🇲🇻","🇸🇴","🇲🇱","🇲🇹","🇲🇷","🇲🇺","🇲🇽","🇲🇩","🇲🇨","🇲🇳","🇲🇪","🇲🇦","🇲🇿","🇲🇲","🇳🇦","🇳🇵","🇳🇱","🇳🇿","🇳🇮","🇳🇪","🇳🇬","🇳🇴","🇴🇲","🇵🇰","🇵🇦","🇵🇾","🇵🇪","🇵🇭","🇵🇹","🇵🇷","🇶🇦","🇷🇴","🇷🇺","🇷🇼","🇸🇲","🇸🇦","🇸🇳","🇷🇸","🇸🇱","🇸🇰","🇸🇮","🇿🇦","🇪🇸","🇱🇰","🇸🇩","🇸🇷","🇸🇿","🇸🇪","🇨🇭","🇸🇾","🇹🇯","🇹🇿","🇹🇭","🇹🇬","🇹🇴","🇹🇹","🇹🇳","🇹🇷","🇹🇲","🇻🇮","🇺🇬","🇺🇦","🇺🇾","🇺🇿","🇻🇪","🇻🇳","🇾🇪","🇿🇲","🇿🇼","🇦🇩","🇷🇪","🇵🇱","🇬🇺","🇻🇦","🇱🇮","🇨🇼","🇸🇨","🇦🇶","🇬🇮","🇨🇺","🇫🇴","🇦🇽","🇧🇲","🇹🇱"];
// prettier-ignore
const ZH = ["香港","澳门","台湾","日本","朝鲜","韩国","新加坡","美国","英国","法国","德国","澳大利亚","阿联酋","阿富汗","阿尔巴尼亚","阿尔及利亚","安哥拉","阿根廷","亚美尼亚","奥地利","阿塞拜疆","巴林","孟加拉国","白俄罗斯","比利时","伯利兹","贝宁","不丹","玻利维亚","波斯尼亚和黑塞哥维那","博茨瓦纳","巴西","英属维京群岛","文莱","保加利亚","布基纳法索","布隆迪","柬埔寨","喀麦隆","加拿大","佛得角","开曼群岛","中非共和国","乍得","智利","哥伦比亚","科摩罗","刚果(金)","刚果(布)","哥斯达黎加","克罗地亚","塞浦路斯","捷克","丹麦","吉布提","多米尼加共和国","厄瓜多尔","埃及","萨尔瓦多","赤道几内亚","厄立特里亚","爱沙尼亚","埃塞俄比亚","斐济","芬兰","加蓬","冈比亚","格鲁吉亚","加纳","希腊","格陵兰","危地马拉","几内亚比绍","几内亚","圭亚那","海地","洪都拉斯","匈牙利","冰岛","印尼","印度","伊朗","伊拉克","爱尔兰","马恩岛","以色列","意大利","科特迪瓦","牙买加","约旦","哈萨克斯坦","肯尼亚","科威特","吉尔吉斯斯坦","老挝","拉脱维亚","黎巴嫩","莱索托","利比里亚","利比亚","立陶宛","卢森堡","马其顿","马达加斯加","马拉维","马来西亚","马尔代夫","索马里","马里","马耳他","毛利塔尼亚","毛里求斯","墨西哥","摩尔多瓦","摩纳哥","蒙古","黑山共和国","摩洛哥","莫桑比克","缅甸","纳米比亚","尼泊尔","荷兰","新西兰","尼加拉瓜","尼日尔","尼日利亚","挪威","阿曼","巴基斯坦","巴拿马","巴拉圭","秘鲁","菲律宾","葡萄牙","波多黎各","卡塔尔","罗马尼亚","俄罗斯","卢旺达","圣马力诺","沙特阿拉伯","塞内加尔","塞尔维亚","塞拉利昂","斯洛伐克","斯洛文尼亚","南非","西班牙","斯里兰卡","苏丹","苏里南","斯威士兰","瑞典","瑞士","叙利亚","塔吉克斯坦","坦桑尼亚","泰国","多哥","汤加","特立尼达和多巴哥","突尼斯","土耳其","土库曼斯坦","美属维尔京群岛","乌干达","乌克兰","乌拉圭","乌兹别克斯坦","委内瑞拉","越南","也门","赞比亚","津巴布韦","安道尔","留尼汪","波兰","关岛","梵蒂冈","列支敦士登","库拉索","塞舌尔","南极","直布罗陀","古巴","法罗群岛","奥兰群岛","百慕达","东帝汶"];
// prettier-ignore
const QC = ["Hong Kong","Macao","Taiwan","Japan","North Korea","Korea","Singapore","United States","United Kingdom","France","Germany","Australia","United Arab Emirates","Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Cayman Islands","Central African Republic","Chad","Chile","Colombia","Comoros","Congo-Kinshasa","Congo-Brazzaville","Costa Rica","Croatia","Cyprus","Czech Republic","Denmark","Djibouti","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Ethiopia","Fiji","Finland","Gabon","Gambia","Georgia","Ghana","Greece","Greenland","Guatemala","Guinea-Bissau","Guinea","Guyana","Haiti","Honduras","Hungary","Iceland","Indonesia","India","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Ivory Coast","Jamaica","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Lithuania","Luxembourg","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Somalia","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar (Burma)","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","Norway","Oman","Pakistan","Panama","Paraguay","Peru","Philippines","Portugal","Puerto Rico","Qatar","Romania","Russia","Rwanda","San Marino","Saudi Arabia","Senegal","Serbia","Sierra Leone","Slovakia","Slovenia","South Africa","Spain","Sri Lanka","Sudan","Suriname","Eswatini","Sweden","Switzerland","Syria","Tajikistan","Tanzania","Thailand","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","U.S. Virgin Islands","Uganda","Ukraine","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe","Andorra","Reunion","Poland","Guam","Vatican","Liechtenstein","Curacao","Seychelles","Antarctica","Gibraltar","Cuba","Faroe Islands","Aland Islands","Bermuda","Timor-Leste"];


// ==========================================
// 🧠 3. 增强匹配：收窄的地区代码兜底
// ==========================================
// 完整名称表未命中才执行；仅保留明确代码和少量常用别名。
// 英文代码有字母边界，允许 JP01；移除 GB（流量单位）、IN/IT/LA（常见词或歧义）。
const rurekey = {
    "香港": /(?<![a-zA-Z])(?:HK|HKG|HKBN)(?![a-zA-Z])|(?<![\u4e00-\u9fa5])港(?![\u4e00-\u9fa5])/i,
    "台湾": /(?<![a-zA-Z])(?:TW|TWN|TPE|TSA|KHH)(?![a-zA-Z])/i,
    "日本": /(?<![a-zA-Z])(?:JP|NRT|HND|KIX|CTS|FUK)(?![a-zA-Z])/i,
    "美国": /(?<![a-zA-Z])(?:US|USA|LAX|SFO|SJC|SEA|JFK|EWR|IAD|DFW|ORD|PDX)(?![a-zA-Z])/i,
    "韩国": /(?<![a-zA-Z])(?:KR|KOR|ICN)(?![a-zA-Z])/i,
    "新加坡": /(?<![a-zA-Z])(?:SG|SIN|XSP)(?![a-zA-Z])/i,
    "英国": /(?<![a-zA-Z])(?:UK|LHR)(?![a-zA-Z])/i,
    "阿联酋": /(?<![a-zA-Z])(?:AE|UAE|DXB)(?![a-zA-Z])/i,
    "德国": /(?<![a-zA-Z])(?:DE|FRA|MUC)(?![a-zA-Z])/i,
    "法国": /(?<![a-zA-Z])(?:FR|CDG)(?![a-zA-Z])/i,
    "澳大利亚": /(?<![a-zA-Z])(?:AU|SYD|MEL)(?![a-zA-Z])/i,
    "加拿大": /(?<![a-zA-Z])(?:CA|YVR|YYZ)(?![a-zA-Z])/i,
    "澳门": /(?<![a-zA-Z])(?:MO|MFM)(?![a-zA-Z])/i,
    "越南": /(?<![a-zA-Z])(?:VN|SGN|HAN)(?![a-zA-Z])/i,
    "荷兰": /(?<![a-zA-Z])(?:NL|AMS)(?![a-zA-Z])/i,
    "瑞士": /(?<![a-zA-Z])(?:CH|ZRH)(?![a-zA-Z])/i,
    "泰国": /(?<![a-zA-Z])(?:TH|BKK)(?![a-zA-Z])/i,
    "印尼": /(?<![a-zA-Z])(?:ID|CGK)(?![a-zA-Z])/i
};


// ==========================================
// 🚀 4. 主执行工作流
// ==========================================
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
const regionPatterns = ZH.map((name, index) => ({
    index,
    aliases: [...new Set([name, QC[index], ...(regionAliases[name] || [])])].map(alias =>
        /[a-zA-Z]/.test(alias)
            ? new RegExp("(?<![a-zA-Z])" + aliasSource(alias), "iu")
            : new RegExp((name === "朝鲜" ? "(?<!南)" : "") + aliasSource(alias), "u"))
}));
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
    for (const row of regionPatterns) {
        if (row.aliases.some(pattern => pattern.test(name)) ||
            (flags.length < 2 && name.includes(FG[row.index]))) return row.index;
    }
    // 增强文字只有唯一地区时才采用；多国旗无明确文字时取原名中的第一面。
    const matches = Object.entries(rurekey).filter(([, regex]) => regex.test(name));
    if (matches.length === 1) return ZH.indexOf(matches[0][0]);
    return flags.length > 1
        ? FG.indexOf(flags.sort((a, b) => name.indexOf(a) - name.indexOf(b))[0]) : -1;
}

// 必须在名称清理前执行，force 比较的是本次原始节点主体，不读取机场后缀。
function classifyQuality(name) {
    const upperName = name.toUpperCase();
    if (forceHList.some(keyword => upperName.includes(keyword))) return tagMap.H;
    if (forceLList.some(keyword => upperName.includes(keyword))) return tagMap.L;
    if (lowQualityKeywords.test(name)) return tagMap.L;
    const multipliers = [...new Set([...name.matchAll(multiplierRegex)]
        .map(match => Number(match[1] || match[2])))];
    // 名称含不同倍率时沿用基础档次，避免任选一个数字。
    if (multipliers.length > 1) return QUALITY_TAG;
    if (multipliers.length === 1 && multipliers[0] < 1) return tagMap.L;
    if (multipliers.length === 1 && multipliers[0] > 1) return tagMap.H;
    if (highQualityKeywords.test(name)) return tagMap.H;
    return QUALITY_TAG;
}

function operator(proxies) {
    const flagRegex = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;
    const emojiRegex = /\p{Extended_Pictographic}[\uFE0E\uFE0F]?|[0-9#*]\uFE0F?\u20E3/gu;
    const keepEmoji = /^(?:[0-9]\uFE0F?\u20E3|[Ⓜ\u{1F130}-\u{1F149}\u{1F170}-\u{1F189}][\uFE0E\uFE0F]?)$/u;
    const usedNames = new Set();
    const nameCounts = new Map();
    const renamedNodes = new Map();
    const suffix = AIRPORT_NAME ? "#" + AIRPORT_NAME : "";
    proxies.forEach((p, index) => {
        if (typeof p.name !== "string") return;
        const originalName = p.name;
        // 机场名始终在末尾；只剥离精确后缀，不删除节点编号。
        let body = originalName;
        if (suffix && body.endsWith(suffix)) {
            body = body.slice(0, -suffix.length);
        }
        const sourceName = body;
        const regionIndex = identifyRegion(sourceName);
        const flag = FG[regionIndex] || "";
        // 清除装饰和旧标记；判定仍使用清理前的主体。
        body = body.replace(emojiRegex, emoji => keepEmoji.test(emoji) ? emoji : "")
            .replace(/[\u{1F3FB}-\u{1F3FF}\u200D]/gu, "");
        body = body.replace(/^(?:\s*[◆◇])+\s*/u, "");

        const quality = classifyQuality(sourceName);
        let pureName = body.replace(flagRegex, "");
        const regionName = ZH[regionIndex];
        if (flag && compactPatterns[regionName]) {
            const patterns = compactPatterns[regionName];
            // 常见地区前缀可紧邻城市、编号、cdn；中间仍只删除独立字段。
            // 仅删除国家名称，保留其前后的分隔符与括号。
            pureName = pureName.replace(patterns.prefix, "").replace(patterns.field, "$1");
        }
        pureName = pureName.replace(/\s+/g, " ").trim();
        if (!pureName && !flag) pureName = "节点 " + (index + 1);
        const baseName = [quality, flag, pureName].filter(Boolean).join(" ");
        let count = nameCounts.get(baseName) || 0;
        let uniqueName = baseName + (count ? "#" + count : "") + suffix;
        while (usedNames.has(uniqueName)) uniqueName = baseName + "#" + ++count + suffix;
        nameCounts.set(baseName, count + 1);
        usedNames.add(uniqueName);
        renamedNodes.set(originalName, uniqueName);
        p.name = uniqueName;
    });
    proxies.forEach(p => {
        if (typeof p["dialer-proxy"] === "string" && renamedNodes.has(p["dialer-proxy"])) {
            p["dialer-proxy"] = renamedNodes.get(p["dialer-proxy"]);
        }
    });
    return proxies;
}
