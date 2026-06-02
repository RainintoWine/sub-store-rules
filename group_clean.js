/**
 * 组合订阅：绝对原版数组白名单优先过滤脚本 (The Ultimate Filter - Final Edition)
 * 核心工作流：手动干预 -> 强杀真实面板 -> 地区白名单护体 -> 软性广告流放 -> 兜底放行
 */

// ==========================================
// ⚙️ 1. 用户配置区 (最高优先级手动干预指令)
// ==========================================
// 提取用户传入的 keep 和 del 参数
const argKeep = typeof $arguments !== 'undefined' && $arguments.keep !== undefined ? decodeURI($arguments.keep) : "";
const argDel = typeof $arguments !== 'undefined' && $arguments.del !== undefined ? decodeURI($arguments.del) : "";

// 将参数按 逗号/顿号 分割，并统一转为大写，确保无视大小写精确拦截
const keepList = argKeep ? argKeep.split(/[,，、]/).map(s => s.trim().toUpperCase()).filter(Boolean) : [];
const delList = argDel ? argDel.split(/[,，、]/).map(s => s.trim().toUpperCase()).filter(Boolean) : [];

// ==========================================
// 🟢 2. 地区大字典白名单 (彻底剔除高误伤的双字母 EN 组)
// ==========================================
// prettier-ignore
const FG = ['🇭🇰','🇲🇴','🇹🇼','🇯🇵','🇰🇷','🇸🇬','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇦🇺','🇦🇪','🇦🇫','🇦🇱','🇩🇿','🇦🇴','🇦🇷','🇦🇲','🇦🇹','🇦🇿','🇧🇭','🇧🇩','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇹','🇧🇴','🇧🇦','🇧🇼','🇧🇷','🇻🇬','🇧🇳','🇧🇬','🇧🇫','🇧🇮','🇰🇭','🇨🇲','🇨🇦','🇨🇻','🇰🇾','🇨🇫','🇹🇩','🇨🇱','🇨🇴','🇰🇲','🇨🇬','🇨🇩','🇨🇷','🇭🇷','🇨🇾','🇨🇿','🇩🇰','🇩🇯','🇩🇴','🇪🇨','🇪🇬','🇸🇻','🇬🇶','🇪🇷','🇪🇪','🇪🇹','🇫🇯','🇫🇮','🇬🇦','🇬🇲','🇬🇪','🇬🇭','🇬🇷','🇬🇱','🇬🇹','🇬🇳','🇬🇾','🇭🇹','🇭🇳','🇭🇺','🇮🇸','🇮🇳','🇮🇩','🇮🇷','🇮🇶','🇮🇪','🇮🇲','🇮🇱','🇮🇹','🇨🇮','🇯🇲','🇯🇴','🇰🇿','🇰🇪','🇰🇼','🇰🇬','🇱🇦','🇱🇻','🇱🇧','🇱🇸','🇱🇷','🇱🇾','🇱🇹','🇱🇺','🇲🇰','🇲🇬','🇲🇼','🇲🇾','🇲🇻','🇲🇱','🇲🇹','🇲🇷','🇲🇺','🇲🇽','🇲🇩','🇲🇨','🇲🇳','🇲🇪','🇲🇦','🇲🇿','🇲🇲','🇳🇦','🇳🇵','🇳🇱','🇳🇿','🇳🇮','🇳🇪','🇳🇬','🇰🇵','🇳🇴','🇴🇲','🇵🇰','🇵🇦','🇵🇾','🇵🇪','🇵🇭','🇵🇹','🇵🇷','🇶🇦','🇷🇴','🇷🇺','🇷🇼','🇸🇲','🇸🇦','🇸🇳','🇷🇸','🇸🇱','🇸🇰','🇸🇮','🇸🇴','🇿🇦','🇪🇸','🇱🇰','🇸🇩','🇸🇷','🇸🇿','🇸🇪','🇨🇭','🇸🇾','🇹🇯','🇹🇿','🇹🇭','🇹🇬','🇹🇴','🇹🇹','🇹🇳','🇹🇷','🇹🇲','🇻🇮','🇺🇬','🇺🇦','🇺🇾','🇺🇿','🇻🇪','🇻🇳','🇾🇪','🇿🇲','🇿🇼','🇦🇩','🇷🇪','🇵🇱','🇬🇺','🇻🇦','🇱🇮','🇨🇼','🇸🇨','🇦🇶','🇬🇮','🇨🇺','🇫🇴','🇦🇽','🇧🇲','🇹🇱'];
// prettier-ignore
const ZH = ['香港','澳门','台湾','日本','韩国','新加坡','美国','英国','法国','德国','澳大利亚','阿联酋','阿富汗','阿尔巴尼亚','阿尔及利亚','安哥拉','阿根廷','亚美尼亚','奥地利','阿塞拜疆','巴林','孟加拉国','白俄罗斯','比利时','伯利兹','贝宁','不丹','玻利维亚','波斯尼亚和黑塞哥维那','博茨瓦纳','巴西','英属维京群岛','文莱','保加利亚','布基纳法索','布隆迪','柬埔寨','喀麦隆','加拿大','佛得角','开曼群岛','中非共和国','乍得','智利','哥伦比亚','科摩罗','刚果(布)','刚果(金)','哥斯达黎加','克罗地亚','塞浦路斯','捷克','丹麦','吉布提','多米尼加共和国','厄瓜多尔','埃及','萨尔瓦多','赤道几内亚','厄立特里亚','爱沙尼亚','埃塞俄比亚','斐济','芬兰','加蓬','冈比亚','格鲁吉亚','加纳','希腊','格陵兰','危地马拉','几内亚','圭亚那','海地','洪都拉斯','匈牙利','冰岛','印度','印尼','伊朗','伊拉克','爱尔兰','马恩岛','以色列','意大利','科特迪瓦','牙买加','约旦','哈萨克斯坦','肯尼亚','科威特','吉尔吉斯斯坦','老挝','拉脱维亚','黎巴嫩','莱索托','利比里亚','利比亚','立陶宛','卢森堡','马其顿','马达加斯加','马拉维','马来西亚','马尔代夫','马里','马耳他','毛利塔尼亚','毛里求斯','墨西哥','摩尔多瓦','摩纳哥','蒙古','黑山共和国','摩洛哥','莫桑比克','缅甸','纳米比亚','尼泊尔','荷兰','新西兰','尼加拉瓜','尼日尔','尼日利亚','朝鲜','挪威','阿曼','巴基斯坦','巴拿马','巴拉圭','秘鲁','菲律宾','葡萄牙','波多黎各','卡塔尔','罗马尼亚','俄罗斯','卢旺达','圣马力诺','沙特阿拉伯','塞内加尔','塞尔维亚','塞拉利昂','斯洛伐克','斯洛文尼亚','索马里','南非','西班牙','斯里兰卡','苏丹','苏里南','斯威士兰','瑞典','瑞士','叙利亚','塔吉克斯坦','坦桑尼亚','泰国','多哥','汤加','特立尼达和多巴哥','突尼斯','土耳其','土库曼斯坦','美属维尔京群岛','乌干达','乌克兰','乌拉圭','乌兹别克斯坦','委内瑞拉','越南','也门','赞比亚','津巴布韦','安道尔','留尼汪','波兰','关岛','梵蒂冈','列支敦士登','库拉索','塞舌尔','南极','直布罗陀','古巴','法罗群岛','奥兰群岛','百慕达','东帝汶'];
// prettier-ignore
const QC = ['Hong Kong','Macao','Taiwan','Japan','Korea','Singapore','United States','United Kingdom','France','Germany','Australia','Dubai','Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','British Virgin Islands','Brunei','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Cape Verde','Cayman Islands','Central African Republic','Chad','Chile','Colombia','Comoros','Congo-Brazzaville','Congo-Kinshasa','Costa Rica','Croatia','Cyprus','Czech Republic','Denmark','Djibouti','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Ethiopia','Fiji','Finland','Gabon','Gambia','Georgia','Ghana','Greece','Greenland','Guatemala','Guinea','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Isle of Man','Israel','Italy','Ivory Coast','Jamaica','Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Lithuania','Luxembourg','Macedonia','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Mauritania','Mauritius','Mexico','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar (Burma)','Namibia','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Portugal','Puerto Rico','Qatar','Romania','Russia','Rwanda','San Marino','Saudi Arabia','Senegal','Serbia','Sierra Leone','Slovakia','Slovenia','Somalia','South Africa','Spain','Sri Lanka','Sudan','Suriname','Eswatini','Sweden','Switzerland','Syria','Tajikistan','Tanzania','Thailand','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','U.S. Virgin Islands','Uganda','Ukraine','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe','Andorra','Reunion','Poland','Guam','Vatican','Liechtenstein','Curacao','Seychelles','Antarctica','Gibraltar','Cuba','Faroe Islands','Aland Islands','Bermuda','Timor-Leste'];

// 合并大字典池，并预先全部转换为大写，极大提升匹配效率
const whitelistUpper = [...FG, ...ZH, ...QC].map(kw => kw.toUpperCase());

// ==========================================
// 🔴 3. 黑名单配置区
// ==========================================
// 3.1 必杀正则：精准狙击真实面板数据 (正则自带 /i 无视大小写)
const trafficKillRegex = /(?:剩余|流量|已用|TOTAL|USE|USED|Traffic)[\s\S]*?\d+(?:\.\d+)?\s*[KMGTP]B/i;
const expireKillRegex = /(?:到期|过期|有效期?|下次重置?|EXPIRE)[\s\S]*?(?:\d{2,4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?|长期(?:有效)?|永久(?:有效)?|无限期|无期限|不限时|按量计费|定量包?|流量包|None|Never|Unlimited|Lifetime)/i;

// 3.2 流放正则：所有广告、营销词、以及孤立的面板词
const pollutionRegex = /(?:过滤.*?\d+.*?条|群|交流|公告|反馈|频道|通知|关注|加入|更新|Channel|Panel|重置|RESET|账单|结算|邀请|返利|套餐|客服|https?:\/\/|官网|网站|网址|获取|订阅|联系|邮箱|工单|说明|提示|教程|EMAIL|贩卖|倒卖|到期|有效|剩余|过期|已用|下次|EXPIRE|TOTAL|USE|USED|Traffic)/i;

// ==========================================
// 🚀 执行 5 步双轨制过滤工作流
// ==========================================
function operator(proxies) {
    return proxies.filter(p => {
        const name = p.name;
        // 统一把节点名称转为大写，用于白名单和自定义参数的比对
        const upperName = name.toUpperCase();
        
        // ----------------------------------------------------
        // 【第 1 步】：最高指令区 (传参强制干预)
        // ----------------------------------------------------
        if (delList.length > 0 && delList.some(kw => upperName.includes(kw))) {
            return false; // 命中强杀参数，直接再见
        }
        if (keepList.length > 0 && keepList.some(kw => upperName.includes(kw))) {
            return true;  // 命中强留参数，颁发黄金免死牌
        }

        // ----------------------------------------------------
        // 【第 2 步】：真·死刑区 (严格正则狙击面板数据，无视白名单国旗)
        // ----------------------------------------------------
        if (trafficKillRegex.test(name)) {
            return false; // 击杀带有 Traffic、GB、剩余流量 等真实数字信息的节点
        }
        if (expireKillRegex.test(name)) {
            return false; // 击杀带有 日期、长期、Never 等真实有效期信息的节点
        }

        // ----------------------------------------------------
        // 【第 3 步】：地区白名单优先护体 (免死金牌)
        // ----------------------------------------------------
        // 只要能活过第2步，且具有真实国家/地区特征，直接保送过关！
        // 哪怕它带有"官网更新"等广告词，也会被这块盾牌死死护住，绝不误杀。
        let isWhiteListed = whitelistUpper.some(keyword => upperName.includes(keyword));
        if (isWhiteListed) {
            return true;
        }

        // ----------------------------------------------------
        // 【第 4 步】：流放区清洗 (扫荡无国家特征的纯广告或孤立词)
        // ----------------------------------------------------
        // 走到这里的，全都是既没触发特判、又没写国家地区的"三无节点"。
        // 此时只要它还带有 "群"、"官网" 等任何杂质，100%是纯广告，扫地出门！
        if (pollutionRegex.test(name)) {
            return false;
        }

        // ----------------------------------------------------
        // 【第 5 步】：兜底放行
        // ----------------------------------------------------
        // 既不带面板数据、也不带国家地区、连一句广告词都没有的纯净安全节点，默认放行。
        return true;
    });
}
