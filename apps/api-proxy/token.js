require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const https = require("https");

const SECRET_KEY = process.env.SECRET_KEY;

const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
const DIFAIS = [
  { m: "SM-S918B", b: "Samsung", u: "Build/TP1A.220624.014" },
  { m: "Pixel 7 Pro", b: "Google", u: "Build/TD1A.220804.009" },
  { m: "M2102K1G", b: "Xiaomi", u: "Build/SKQ1.210908.001" },
  { m: "CPH2307", b: "OPPO", u: "Build/RKQ1.211119.001" },
];

const randomHex = (len) => crypto.randomBytes(len / 2).toString("hex");
const generateUUID = () => crypto.randomUUID();
const randomNumber = (len) => {
  let res = "";
  for (let i = 0; i < len; i++) res += Math.floor(Math.random() * 10);
  return res;
};

function getSignature(ts, bodyStr, devId, andId, token) {
  const payload = `timestamp=${ts}${bodyStr}${devId}${andId}${token}`;
  const signer = crypto.createSign("SHA256");
  signer.update(payload);
  signer.end();
  return signer.sign(SECRET_KEY, "base64");
}

async function getNewToken() {
  const timestamp = Date.now().toString();
  const deviceId = generateUUID();
  const androidId = `00000000${randomHex(16)}00000000`;
  const instanceId = randomHex(32);
  const afid = `${timestamp}-${randomNumber(19)}`;
  const dev = DIFAIS[Math.floor(Math.random() * DIFAIS.length)];

  const bsBody = JSON.stringify({ distinctId: randomHex(16) });
  const bsSn = getSignature(timestamp, bsBody, deviceId, androidId, "");

  try {
    const res = await axios.post(
      "https://sapi.dramaboxdb.com/drama-box/ap001/bootstrap",
      bsBody,
      {
        params: { timestamp },
        headers: {
          host: "sapi.dramaboxdb.com",
          "package-name": "com.storymatrix.drama",
          version: "502",
          vn: "5.0.2",
          p: "52",
          cid: "XDASEO1000000",
          apn: "2",
          mcc: "510",
          locale: "in_ID",
          language: "in",
          "device-id": deviceId,
          "android-id": androidId,
          nchid: "DRA1000042",
          instanceid: instanceId,
          tn: "",
          sn: bsSn,
          md: dev.m,
          brand: dev.b,
          build: dev.u,
          "content-type": "application/json; charset=UTF-8",
          "user-agent": "okhttp/4.10.0",
        },
        httpsAgent: agent,
      },
    );

    if (res.data.success) {
      return {
        status: "success",
        data: {
          uid: res.data.data.user.uid,
          token: `Bearer ${res.data.data.user.token}`,
          deviceId,
          androidId,
          instanceId,
          afid,
          deviceModel: dev.m,
          deviceBrand: dev.b,
          deviceBuild: dev.u,
        },
      };
    } else {
      return { status: "error", message: res.data.message };
    }
  } catch (e) {
    console.error("[TOKEN GEN ERROR]", e.message);
    if (e.response) {
      console.error(" - Status:", e.response.status);
      console.error(" - Data:", JSON.stringify(e.response.data));
    }
    return { status: "error", message: e.message };
  }
}

module.exports = { getNewToken, getSignature, agent };

if (require.main === module) {
  (async () => {
    console.log("Testing Token Generation...");
    const result = await getNewToken();
    console.log(JSON.stringify(result, null, 2));
  })();
}
