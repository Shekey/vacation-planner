import { describe, expect, it } from "vitest";
import { clientIp, networkOf } from "@/lib/sign-in-limit";

describe("clientIp", () => {
  it("takes the platform's address, else the first forwarded one", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-forwarded-for": " 198.51.100.1 , 10.0.0.1" }))).toBe("198.51.100.1");
    expect(clientIp(new Headers())).toBeNull();
  });
});

describe("networkOf", () => {
  it("keeps IPv4 addresses and cuts IPv6 to its /64", () => {
    expect(networkOf("203.0.113.7")).toBe("203.0.113.7");
    expect(networkOf("2001:db8:0:12:abcd::1")).toBe("2001:db8:0:12::/64");
    expect(networkOf("2001:DB8:0000:0012:ffff:1:2:3")).toBe("2001:db8:0:12::/64");
    expect(networkOf("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(networkOf("::1")).toBe("0:0:0:0::/64");
  });
});
