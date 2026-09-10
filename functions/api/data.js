// Cloudflare Pages Functions
// GET  /api/data  -> GitHubリポジトリのdata.jsonを読み込んで返す
// POST /api/data  -> 受け取ったJSONでdata.jsonを上書きコミットする
// GITHUB_TOKEN は Cloudflare Pages の Settings > Environment variables (Secret) に登録する

const OWNER = 'yooogeee16';
const REPO = 'Shukatsu';
const FILE_PATH = 'data.json';

function ghHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'shukatsu-note-site',
    'Accept': 'application/vnd.github+json'
  };
}

function b64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64DecodeUtf8(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
}

export async function onRequestGet(context) {
  const token = context.env.GITHUB_TOKEN;
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
  const res = await fetch(url, { headers: ghHeaders(token) });
  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'github fetch failed', status: res.status }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
  const json = await res.json();
  const content = b64DecodeUtf8(json.content);
  return new Response(content, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost(context) {
  const token = context.env.GITHUB_TOKEN;
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

  const bodyText = await context.request.text();
  // 現在のファイルのshaを取得（更新には必須）
  const getRes = await fetch(url, { headers: ghHeaders(token) });
  if (!getRes.ok) {
    return new Response(JSON.stringify({ error: 'sha fetch failed', status: getRes.status }), {
      status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
  const getJson = await getRes.json();
  const sha = getJson.sha;

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: '就活ノート: データ更新',
      content: b64EncodeUtf8(bodyText),
      sha
    })
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    return new Response(JSON.stringify({ error: 'github write failed', detail: errText }), {
      status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
