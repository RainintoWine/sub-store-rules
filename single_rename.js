/**
 * 极简无损节点打标与重命名脚本 (The Ultimate Fusion Edition - Perfected)
 * 核心工作流：参数解析 -> 大字典精确提货 -> 雷达补漏 -> 分步去旗去标 -> 倍率判定/强制打标 -> 无损拼装
 */

// ==========================================
// ⚙️ 1. 用户配置区 
// ==========================================
// 1. 质量标签映射：H -> 🔋 (极速/专线)，L -> 🪫 (普通/兜底)
const rawTag = typeof $arguments !== 'undefined' && $arguments.tag !== undefined ? decodeURI($arguments.tag).toUpperCase() : "H";
const tagMap = { 
    "H": "🔋", 
    "L": "🪫" 
};
const QUALITY_TAG = tagMap[rawTag] || rawTag;

// 2. 机场名称后缀
const AIRPORT_NAME = typeof $arguments !== 'undefined' && $arguments.name !== undefined ? decodeURI($arguments.name) : "机场名";

// 3. 极简哲学版：低倍率/白嫖节点识别 (已修复 test 误伤 latest 的边界漏洞)
const regexLowRate = /(?:0\.[0-8](?:[xX]|倍)|[xX]0\.[0-8]|低倍率|省流|实验性|免费|(?<![a-zA-Z])test(?![a-zA-Z])|(?<![a-zA-Z])beta(?![a-zA-Z]))/i;

// 4. 自定义关键字强制标记规则 (统一转大写，无视大小写精确拦截)
const argForceH = typeof $arguments !== 'undefined' && $arguments.forceH !== undefined ? decodeURI($arguments.forceH) : "";
const argForceL = typeof $arguments !== 'undefined' && $arguments.forceL !== undefined ? decodeURI($arguments.forceL) : "";

const forceHList = argForceH ? argForceH.split(/[,，、]/).map(s => s.trim().toUpperCase()).filter(Boolean) : [];
const forceLList = argForceL ? argForceL.split(/[,，、]/).map(s => s.trim().toUpperCase()).filter(Boolean) : [];

// ==========================================
// 📦 2. 核心一：148国对齐矩阵 (加入QC数组，实现过滤/重命名能力双端100%统一)
// ==========================================
// prettier-ignore
const FG = ['🇭🇰','🇲🇴','🇹🇼','🇯🇵','🇰🇷','🇸🇬','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇦🇺','🇦🇪','🇦🇫','🇦🇱','🇩🇿','🇦🇴','🇦🇷','🇦🇲','🇦🇹','🇦🇿','🇧🇭','🇧🇩','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇹','🇧🇴','🇧🇦','🇧🇼','🇧🇷','🇻🇬','🇧🇳','🇧🇬','🇧🇫','🇧🇮','🇰🇭','🇨🇲','🇨🇦','🇨🇻','🇰🇾','🇨🇫','🇹🇩','🇨🇱','🇨🇴','🇰🇲','🇨🇬','🇨🇩','🇨🇷','🇭🇷','🇨🇾','🇨🇿','🇩🇰','🇩🇯','🇩🇴','🇪🇨','🇪🇬','🇸🇻','🇬🇶','🇪🇷','🇪🇪','🇪🇹','🇫🇯','🇫🇮','🇬🇦','🇬🇲','🇬🇪','🇬🇭','🇬🇷','🇬🇱','🇬🇹','🇬🇳','🇬🇾','🇭🇹','🇭🇳','🇭🇺','🇮🇸','🇮🇳','🇮🇩','🇮🇷','🇮🇶','🇮🇪','🇮🇲','🇮🇱','🇮🇹','🇨🇮','🇯🇲','🇯🇴','🇰🇿','🇰🇪','🇰🇼','🇰🇬','🇱🇦','🇱🇻','🇱🇧','🇱🇸','🇱🇷','🇱🇾','🇱🇹','🇱🇺','🇲🇰','🇲🇬','🇲🇼','🇲🇾','🇲🇻','🇲🇱','🇲🇹','🇲🇷','🇲🇺','🇲🇽','🇲🇩','🇲🇨','🇲🇳','🇲🇪','🇲🇦','🇲🇿','🇲🇲','🇳🇦','🇳🇵','🇳🇱','🇳🇿','🇳🇮','🇳🇪','🇳🇬','🇰🇵','🇳🇴','🇴🇲','🇵🇰','🇵🇦','🇵🇾','🇵🇪','🇵🇭','🇵🇹','🇵🇷','🇶🇦','🇷🇴','🇷🇺','🇷🇼','🇸🇲','🇸🇦','🇸🇳','🇷🇸','🇸🇱','🇸🇰','🇸🇮','🇸🇴','🇿🇦','🇪🇸','🇱🇰','🇸🇩','🇸🇷','🇸🇿','🇸🇪','🇨🇭','🇸🇾','🇹🇯','🇹🇿','🇹🇭','🇹🇬','🇹🇴','🇹🇹','🇹🇳','🇹🇷','🇹🇲','🇻🇮','🇺🇬','🇺🇦','🇺🇾','🇺🇿','🇻🇪','🇻🇳','🇾🇪','🇿🇲','🇿🇼','🇦🇩','🇷🇪','🇵🇱','🇬🇺','🇻🇦','🇱🇮','🇨🇼','🇸🇨','🇦🇶','🇬🇮','🇨🇺','🇫🇴','🇦🇽','🇧🇲','🇹🇱'];
// prettier-ignore
const ZH = ['香港','澳门','台湾','日本','韩国','新加坡','美国','英国','法国','德国','澳大利亚','阿联酋','阿富汗','阿尔巴尼亚','阿尔及利亚','安哥拉','阿根廷','亚美尼亚','奥地利','阿塞拜疆','巴林','孟加拉国','白俄罗斯','比利时','伯利兹','贝宁','不丹','玻利维亚','波斯尼亚和黑塞哥维那','博茨瓦纳','巴西','英属维京群岛','文莱','保加利亚','布基纳法索','布隆迪','柬埔寨','喀麦隆','加拿大','佛得角','开曼群岛','中非共和国','乍得','智利','哥伦比亚','科摩罗','刚果(布)','刚果(金)','哥斯达黎加','克罗地亚','塞浦路斯','捷克','丹麦','吉布提','多米尼加共和国','厄瓜多尔','埃及','萨尔瓦多','赤道几内亚','厄立特里亚','爱沙尼亚','埃塞俄比亚','斐济','芬兰','加蓬','冈比亚','格鲁吉亚','加纳','希腊','格陵兰','危地马拉','几内亚','圭亚那','海地','洪都拉斯','匈牙利','冰岛','印度','印尼','伊朗','伊拉克','爱尔兰','马恩岛','以色列','意大利','科特迪瓦','牙买加','约旦','哈萨克斯坦','肯尼亚','科威特','吉尔吉斯斯坦','老挝','拉脱维亚','黎巴嫩','莱索托','利比里亚','利比亚','立陶宛','卢森堡','马其顿','马达加斯加','马拉维','马来西亚','马尔代夫','马里','马耳他','毛利塔尼亚','毛里求斯','墨西哥','摩尔多瓦','摩纳哥','蒙古','黑山共和国','摩洛哥','莫桑比克','缅甸','纳米比亚','尼泊尔','荷兰','新西兰','尼加拉瓜','尼日尔','尼日利亚','朝鲜','挪威','阿曼','巴基斯坦','巴拿马','巴拉圭','秘鲁','菲律宾','葡萄牙','波多黎各','卡塔尔','罗马尼亚','俄罗斯','卢旺达','圣马力诺','沙特阿拉伯','塞内加尔','塞尔维亚','塞拉利昂','斯洛伐克','斯洛文尼亚','索马里','南非','西班牙','斯里兰卡','苏丹','苏里南','斯威士兰','瑞典','瑞士','叙利亚','塔吉克斯坦','坦桑尼亚','泰国','多哥','汤加','特立尼达和多巴哥','突尼斯','土耳其','土库曼斯坦','美属维尔京群岛','乌干达','乌克兰','乌拉圭','乌兹别克斯坦','委内瑞拉','越南','也门','赞比亚','津巴布韦','安道尔','留尼汪','波兰','关岛','梵蒂冈','列支敦士登','库拉索','塞舌尔','南极','直布罗陀','古巴','法罗群岛','奥兰群岛','百慕达','东帝汶'];
// prettier-ignore
const QC = ['Hong Kong','Macao','Taiwan','Japan','Korea','Singapore','United States','United Kingdom','France','Germany','Australia','Dubai','Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','British Virgin Islands','Brunei','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Cape Verde','Cayman Islands','Central African Republic','Chad','Chile','Colombia','Comoros','Congo-Brazzaville','Congo-Kinshasa','Costa Rica','Croatia','Cyprus','Czech Republic','Denmark','Djibouti','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Ethiopia','Fiji','Finland','Gabon','Gambia','Georgia','Ghana','Greece','Greenland','Guatemala','Guinea','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Isle of Man','Israel','Italy','Ivory Coast','Jamaica','Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Lithuania','Luxembourg','Macedonia','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Mauritania','Mauritius','Mexico','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar (Burma)','Namibia','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Portugal','Puerto Rico','Qatar','Romania','Russia','Rwanda','San Marino','Saudi Arabia','Senegal','Serbia','Sierra Leone','Slovakia','Slovenia','Somalia','South Africa','Spain','Sri Lanka','Sudan','Suriname','Eswatini','Sweden','Switzerland','Syria','Tajikistan','Tanzania','Thailand','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','U.S. Virgin Islands','Uganda','Ukraine','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe','Andorra','Reunion','Poland','Guam','Vatican','Liechtenstein','Curacao','Seychelles','Antarctica','Gibraltar','Cuba','Faroe Islands','Aland Islands','Bermuda','Timor-Leste'];

// 提前将 QC 转换为大写，极大提升后续检索效率
const QCUpper = QC.map(name => name.toUpperCase());

// ==========================================
// 🧠 3. 核心二：高精度实战地区识别引擎 (第二优先级雷达)
// ==========================================
const rurekey = {
    // 核心主力地区
    "香港": /香港|(?:深|沪|呼|京|广|杭)港|(?<![\u4e00-\u9fa5])港(?![\u4e00-\u9fa5])|(?<![a-zA-Z])HK(?![a-zA-Z])|Hong(?:Kong)?|HKG|HKBN|🇭🇰/i,
    "台湾": /台湾|新北|彰化|台北|(?<![\u4e00-\u9fa5])台(?![\u4e00-\u9fa5])|(?<![a-zA-Z])TW(?![a-zA-Z])|Tai\s?wan|Tai(?:pei)?|TPE|TSA|KHH|🇹🇼/i,
    "日本": /日本|东京|大[阪坂]|埼玉|(?:川|泉|沪|深|中|辽)日|(?<![\u4e00-\u9fa5])日(?![\u4e00-\u9fa5])|(?<![a-zA-Z])JP(?![a-zA-Z])|Japan|Tokyo|Osaka|NRT|HND|KIX|CTS|FUK|🇯🇵/i,
    "美国": /美国|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|哥伦布|纽约|(?:深|沪|呼|京|广|杭)美|(?<![\u4e00-\u9fa5])美(?![\u4e00-\u9fa5])|(?<![a-zA-Z])US(?:A)?(?![a-zA-Z])|United States|Los Angeles|San Jose|Silicon Valley|Michigan|ATL|BUF|DFW|EWR|IAD|JFK|LAX|MCI|MIA|ORD|PDX|PHX|SEA|SFO|SJC|🇺🇸/i,
    "韩国": /韩国|首尔|春川|南朝鲜|(?<![\u4e00-\u9fa5])韩(?![\u4e00-\u9fa5])|(?<![a-zA-Z])KR(?![a-zA-Z])|KOR|Korea|South Korea|Seoul|Chuncheon|ICN|🇰🇷/i,
    "新加坡": /新加坡|狮城|(?:深|沪|呼|京|广|杭)新|(?<![\u4e00-\u9fa5])坡(?![\u4e00-\u9fa5])|(?<![a-zA-Z])SG(?![a-zA-Z])|Sing(?:apore)?|SIN|XSP|🇸🇬/i,
    
    // 欧洲及其他高价值地区 (已全面加固字母边界)
    "英国": /英国|伦敦|(?<![\u4e00-\u9fa5])英(?![\u4e00-\u9fa5])|(?<![a-zA-Z])UK(?![a-zA-Z])|(?<!\d\s?)(?<![a-zA-Z])GB(?![a-zA-Z])|United Kingdom|Great Britain|London|LHR|🇬🇧/i,
    "阿联酋": /阿联酋|迪拜|阿拉伯联合酋长国|(?<![a-zA-Z])(?:AE|UAE)(?![a-zA-Z])|Dubai|United Arab Emirates|DXB|🇦🇪/i,
    "俄罗斯": /俄罗斯|莫斯科|伯力|海参崴|(?<![\u4e00-\u9fa5])俄(?![\u4e00-\u9fa5])|(?<![a-zA-Z])RU(?![a-zA-Z])|Russia|Moscow|SVO|🇷🇺/i,
    "德国": /德国|法兰克福|慕尼黑|(?:深|沪|呼|京|广|杭|滬)德(?!.*(?:I|线))|(?<![\u4e00-\u9fa5])德(?![\u4e00-\u9fa5])|(?<![a-zA-Z])DE(?![a-zA-Z])|Germany|Frankfurt|FRA|MUC|🇩🇪/i,
    "法国": /法国|巴黎|(?<![\u4e00-\u9fa5])法(?![\u4e00-\u9fa5])|(?<![a-zA-Z])FR(?![a-zA-Z])|France|Paris|CDG|🇫🇷/i,
    "荷兰": /荷兰|阿姆斯特丹|(?<![\u4e00-\u9fa5])荷(?![\u4e00-\u9fa5])|(?<![a-zA-Z])NL(?![a-zA-Z])|Netherlands|Amsterdam|AMS|🇳🇱/i,
    "意大利": /意大利|罗马|米兰|(?<![\u4e00-\u9fa5])意(?![\u4e00-\u9fa5])|(?<![a-zA-Z])IT(?![a-zA-Z])|Italy|Rome|Milan|FCO|MXP|🇮🇹/i,
    "西班牙": /西班牙|马德里|巴塞罗那|(?<![\u4e00-\u9fa5])西(?![\u4e00-\u9fa5])|(?<![a-zA-Z])ES(?![a-zA-Z])|Spain|Madrid|Barcelona|MAD|BCN|🇪🇸/i,
    "瑞士": /瑞士|苏黎世|(?<![a-zA-Z])CH(?![a-zA-Z])|Switzerland|Zurich|ZRH|🇨🇭/i,
    "瑞典": /瑞典|(?<![a-zA-Z])SE(?![a-zA-Z])|Sweden|🇸🇪/i,
    "捷克": /捷克(?:共和国)?|(?<![a-zA-Z])CZ(?![a-zA-Z])|Czech|🇨🇿/i,
    "比利时": /比利时|布鲁塞尔|(?<![a-zA-Z])BE(?![a-zA-Z])|Belgium|Brussels|BRU|🇧🇪/i,
    "波斯尼亚和黑塞哥维那": /波黑(?:共和国)?|波斯尼亚和黑塞哥维那|(?<![a-zA-Z])BA(?![a-zA-Z])|Bosnia|Herzegovina|🇧🇦/i, 
    "澳大利亚": /澳大利亚|澳洲|墨尔本|悉尼|土澳|(?:深|沪|呼|京|广|杭)澳|(?<![a-zA-Z])AU(?![a-zA-Z])|Australia|Sydney|Melbourne|SYD|MEL|🇦🇺/i,
    "泰国": /泰[国國]|曼谷|(?<![a-zA-Z])TH(?![a-zA-Z])|Thailand|Bangkok|BKK|🇹🇭/i,
    "印尼": /印尼|印度尼西亚|雅加达|(?<![a-zA-Z])ID(?![a-zA-Z])|Indonesia|Jakarta|CGK|🇮🇩/i,
    "印度": /印度|孟买|(?<![a-zA-Z])IN(?![a-zA-Z])|India|Mumbai|BOM|🇮🇳/i,
    "土耳其": /土耳其|伊斯坦布尔|(?<![a-zA-Z])TR(?![a-zA-Z])|Turkey|Istanbul|IST|🇹🇷/i, 
    "孟加拉国": /孟加拉(?:国)?|(?<![a-zA-Z])BD(?![a-zA-Z])|Bangladesh|🇧🇩/i,
    "阿根廷": /阿根廷|(?<![a-zA-Z])AR(?:G)?(?![a-zA-Z])|Argentina|BUE|EZE|🇦🇷/i,
    
    // 其他地区
    "澳门": /澳门|(?<![a-zA-Z])MO(?![a-zA-Z])|Macau|MFM|🇲🇴/i,
    "越南": /越南|(?<![a-zA-Z])VN(?![a-zA-Z])|Vietnam|SGN|HAN|🇻🇳/i,
    "加拿大": /加拿大|(?<![a-zA-Z])CA(?![a-zA-Z])|Canada|YVR|YYZ|🇨🇦/i,
    "菲律宾": /菲律宾|(?<![a-zA-Z])PH(?![a-zA-Z])|Philippines|MNL|🇵🇭/i,
    "柬埔寨": /柬埔寨|(?<![a-zA-Z])KH(?![a-zA-Z])|Cambodia|PNH|🇰🇭/i,
    "埃及": /埃及|(?<![a-zA-Z])EG(?![a-zA-Z])|Egypt|CAI|🇪🇬/i,
    "蒙古": /蒙古|(?<![a-zA-Z])MN(?![a-zA-Z])|Mongolia|ULN|🇲🇳/i,
    "老挝": /老挝|(?<![a-zA-Z])LA(?![a-zA-Z])|Laos|VTE|🇱🇦/i,
    "缅甸": /缅甸|(?<![a-zA-Z])MM(?![a-zA-Z])|Myanmar|RGN|🇲🇲/i,
    "文莱": /文莱|(?<![a-zA-Z])BN(?![a-zA-Z])|Brunei|BWN|🇧🇳/i,
    "巴基斯坦": /巴基斯坦|(?<![a-zA-Z])PK(?![a-zA-Z])|Pakistan|ISB|KHI|🇵🇰/i,
    "黑山共和国": /黑山(?:共和国)?/i,
    "沙特阿拉伯": /沙特(?:阿拉伯)?/i,
    "哈萨克斯坦": /哈萨克(?:斯坦)?/i
};


// ==========================================
// 🚀 4. 主执行工作流
// ==========================================
function operator(proxies) {
    // 【清理正则 1】：专门匹配区域指示符组合的国家国旗 Emoji
    const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
    
    // 【清理正则 2】：广谱匹配各类图标、交通工具、符号等杂乱 Emoji (不包含国旗段)
    const emojiRegex = /[\u2600-\u27BF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEF6]/g;
    
    // 用于记录节点名称出现次数的去重字典
    const nameTracker = {};

    return proxies.map(p => {
        let matchedRegion = null;
        const upperName = p.name.toUpperCase();

        // 【第一步】：148国底层大字典精准兜底 (防短词劫持，最高优先级)
        for (let i = 0; i < ZH.length; i++) {
            // 同时匹配 中文、纯国旗、以及 英文全称 (利用预处理过的 QCUpper)
            if (p.name.includes(ZH[i]) || p.name.includes(FG[i]) || upperName.includes(QCUpper[i])) {
                matchedRegion = ZH[i];
                break;
            }
        }

        // 【第二步】：高精度引擎侦测补漏 (处理简称、机场代码、多字别名等)
        if (!matchedRegion) {
            for (const [standardName, regex] of Object.entries(rurekey)) {
                if (regex.test(p.name)) {
                    matchedRegion = standardName;
                    break; 
                }
            }
        }

        // 【第三步】：提货标准国旗
        let finalFlag = "";
        if (matchedRegion) {
            const index = ZH.indexOf(matchedRegion);
            if (index !== -1) {
                finalFlag = FG[index] + " "; 
            }
        }

        // 【第四步】：分段物理清洗底板（严格遵守两步独立清理）
        let pureName = p.name;
        // 清洗动作 1：拔除所有国旗
        pureName = pureName.replace(flagRegex, '').trim();
        // 清洗动作 2：扫除各类杂乱图标/Emoji (注意：如果节点原名自带🔋，这一步会被清洗掉，这是好事，防止双电池重叠)
        pureName = pureName.replace(emojiRegex, '').trim();

        // 连续空格压缩为单个空格
        pureName = pureName.replace(/\s+/g, ' ');

        // 【第五步】：无损拼装与打标逻辑
        let currentQualityTag = QUALITY_TAG;
        
        // 5.1 自动低倍率降级
        if (regexLowRate.test(p.name)) {
            currentQualityTag = tagMap["L"]; 
        }
        
        // 5.2 强制多关键字覆盖 (最高优先级覆盖判定，无视大小写)
        if (forceHList.length > 0 && forceHList.some(kw => upperName.includes(kw))) {
            currentQualityTag = tagMap["H"];
        } else if (forceLList.length > 0 && forceLList.some(kw => upperName.includes(kw))) {
            currentQualityTag = tagMap["L"];
        }

        let prefix = currentQualityTag ? `${currentQualityTag} ` : "";
        let suffix = AIRPORT_NAME ? `-${AIRPORT_NAME}` : "";

        // 【第六步】：终极输出赋值与自动同名去重
        let baseName = `${prefix}${finalFlag}${pureName}${suffix}`;
        
        if (nameTracker[baseName] === undefined) {
            nameTracker[baseName] = 0;
            p.name = baseName;
        } else {
            nameTracker[baseName]++;
            p.name = `${baseName}-${nameTracker[baseName]}`;
        }

        return p;
    });
}
