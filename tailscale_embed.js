// 更新：2026-11-23 22:22（UTC+8）；安卓等内嵌 Tailscale 客户端通用叠加脚本（挂在 group_config.js / single_config.js 之后）。
// 不含任何密钥、个人尾网域名或设备 IP；新设备首次入网可通过 Sub-Store 参数临时传入 #authKey=tskey-...，入网后删除参数即可。
function main(config) {
  const rawArgs = typeof $arguments !== "undefined" && $arguments ? $arguments : {};
  const args = Object.fromEntries(
    Object.entries(rawArgs).map(([key, value]) => [key.toLowerCase(), value])
  );
  const readArg = (key, fallback = "") => {
    const value = args[key.toLowerCase()];
    if (value === undefined || value === null || value === "") return fallback;
    const text = String(value);
    try { return decodeURIComponent(text); } catch { return text; }
  };

  const proxyName = readArg("name", "Tailscale-Codeg");
  const hostname = readArg("hostname", "clash-meta-android");
  const stateDir = readArg("stateDir", "tailscale-codeg");
  const authKey = readArg("authKey", "").trim();

  if (!Array.isArray(config.rules) || !config.dns || config.dns.enable !== true) {
    throw new Error("请把 tailscale_embed.js 放在 group_config.js 或 single_config.js 之后。");
  }

  // 1. 移除原生端 Tailscale-Direct 出口，注入内嵌 type: tailscale 节点（不加入任何策略组）。
  const proxies = config.proxies ?? [];
  if (proxies.some(proxy => proxy.name === proxyName && proxy.type !== "tailscale")) {
    throw new Error("现有配置已经使用了节点名 " + proxyName + "。");
  }
  config.proxies = [
    ...proxies.filter(proxy => proxy.name !== proxyName && proxy.name !== "Tailscale-Direct"),
    {
      name: proxyName,
      type: "tailscale",
      hostname,
      "state-dir": stateDir,
      "accept-routes": false,
      "ip-version": "ipv4",
      udp: true,
      ...(authKey ? { "auth-key": authKey } : {})
    }
  ];

  // 2. 内嵌 Tailscale 客户端需要由 Mihomo 接管尾网流量，不能在 TUN 中排除尾网网段。
  const tailnetCidrs = new Set(["100.64.0.0/10", "fd7a:115c:a1e0::/48"]);
  if (config.tun && Array.isArray(config.tun["route-exclude-address"])) {
    const filtered = config.tun["route-exclude-address"].filter(cidr => !tailnetCidrs.has(cidr));
    if (filtered.length) {
      config.tun["route-exclude-address"] = filtered;
    } else {
      delete config.tun["route-exclude-address"];
    }
  }

  // 3. 将 *.ts.net MagicDNS 切换为内嵌 Tailscale DNS，并保留 fake-ip 排除。
  config.dns["nameserver-policy"] = {
    ...(config.dns["nameserver-policy"] ?? {}),
    "+.ts.net": "tailscale://" + proxyName
  };
  const fakeIpFilterMode = config.dns["fake-ip-filter-mode"] ?? "blacklist";
  const tailscaleFilterEntries = new Set(["+.ts.net", "DOMAIN-SUFFIX,ts.net,real-ip"]);
  const fakeIpFilter = (config.dns["fake-ip-filter"] ?? []).filter(entry => !tailscaleFilterEntries.has(entry));
  if (fakeIpFilterMode === "rule") {
    fakeIpFilter.push("DOMAIN-SUFFIX,ts.net,real-ip");
  } else if (fakeIpFilterMode !== "whitelist") {
    fakeIpFilter.push("+.ts.net");
  }
  config.dns["fake-ip-filter"] = fakeIpFilter;

  // 4. 将全尾网域名与网段（替换原生端 Tailscale-Direct 规则）统一指向内嵌 Tailscale 出站。
  const tailnetMatchers = new Set([
    "DOMAIN-SUFFIX,ts.net",
    "IP-CIDR,100.64.0.0/10",
    "IP-CIDR6,fd7a:115c:a1e0::/48"
  ]);
  const embedRules = [
    "DOMAIN-SUFFIX,ts.net," + proxyName,
    "IP-CIDR,100.64.0.0/10," + proxyName + ",no-resolve",
    "IP-CIDR6,fd7a:115c:a1e0::/48," + proxyName + ",no-resolve"
  ];
  const cleanedRules = config.rules.filter(rule => {
    const parts = String(rule).split(",");
    return !tailnetMatchers.has(parts.slice(0, 2).join(","));
  });
  config.rules = [...embedRules, ...cleanedRules];

  return config;
}
