// 安卓 Clash Meta 专用，放在 group_config.js 或 single_config.js 之后。
// 私有 Sub-Store 参数：hostname、stateDir 必填，name、tailnet 可选。
function main(config) {
  const rawArgs = typeof $arguments !== "undefined" ? $arguments ?? {} : {};
  const args = Object.fromEntries(
    Object.entries(rawArgs).map(([key, value]) => [key.toLowerCase(), value])
  );
  const readArg = key => typeof args[key] === "string" ? args[key].trim() : "";

  const proxyName = readArg("name") || "Tailscale-Android";
  const hostname = readArg("hostname");
  const stateDir = readArg("statedir");
  const tailnet = readArg("tailnet").toLowerCase().replace(/\.$/, "") || "ts.net";
  const nativeName = "Tailscale-Direct";

  if (!hostname || !stateDir) {
    throw new Error("请在私有 Sub-Store 中提供已有安卓节点的 hostname 和 stateDir。");
  }
  if (args.authkey || args["auth-key"]) {
    throw new Error("请移除脚本参数中的入网密钥。安卓配置使用已保存的设备状态。");
  }
  if (tailnet !== "ts.net" && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.ts\.net$/.test(tailnet)) {
    throw new Error("tailnet 参数需要是尾网的 ts.net 后缀。");
  }
  if (!Array.isArray(config.rules) || !config.dns || config.dns.enable !== true) {
    throw new Error("请把 tailscale_embed.js 放在 group_config.js 或 single_config.js 之后。");
  }

  const proxies = config.proxies ?? [];
  if (!/^[A-Za-z0-9_-]+$/.test(proxyName) ||
      ["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE", "GLOBAL", nativeName].includes(proxyName) ||
      config["proxy-groups"]?.some(group => group.name === proxyName) ||
      proxies.some(proxy => proxy.name === proxyName && proxy.type !== "tailscale")) {
    throw new Error("请为安卓 Tailscale 出站指定可用的英文节点名。");
  }
  config.proxies = [
    ...proxies.filter(proxy => proxy.name !== proxyName && proxy.name !== nativeName),
    {
      name: proxyName,
      type: "tailscale",
      hostname,
      "state-dir": stateDir,
      "accept-routes": false,
      "ip-version": "ipv4",
      udp: true
    }
  ];

  const ipv4 = "100.64.0.0/10";
  const ipv6 = "fd7a:115c:a1e0::/48";
  if (config.tun && Array.isArray(config.tun["route-exclude-address"])) {
    const filtered = config.tun["route-exclude-address"].filter(cidr => cidr !== ipv4 && cidr !== ipv6);
    if (filtered.length) {
      config.tun["route-exclude-address"] = filtered;
    } else {
      delete config.tun["route-exclude-address"];
    }
  }

  const nameserverPolicy = { ...config.dns["nameserver-policy"] };
  delete nameserverPolicy["+.ts.net"];
  nameserverPolicy["+." + tailnet] = "tailscale://" + proxyName;
  config.dns["nameserver-policy"] = nameserverPolicy;

  const tailnetMatchers = new Set([
    "DOMAIN-SUFFIX,ts.net",
    "DOMAIN-SUFFIX," + tailnet,
    "IP-CIDR," + ipv4,
    "IP-CIDR6," + ipv6
  ]);
  const embedRules = [
    "DOMAIN-SUFFIX," + tailnet + "," + proxyName,
    "IP-CIDR," + ipv4 + "," + proxyName + ",no-resolve",
    "IP-CIDR6," + ipv6 + "," + proxyName + ",no-resolve"
  ];
  const cleanedRules = config.rules.filter(rule => {
    const [type, destination, target] = String(rule).split(",");
    return !(tailnetMatchers.has(type + "," + destination) && (target === nativeName || target === proxyName));
  });
  config.rules = [...embedRules, ...cleanedRules];

  return config;
}
