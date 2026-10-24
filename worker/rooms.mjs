const json=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
const token=()=>crypto.randomUUID()+crypto.randomUUID();
const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max?v:min;
export function sanitizeInput(v={}){v=v&&typeof v==='object'?v:{};const out={};for(const k of ['x','y','angle'])out[k]=Number.isFinite(v[k])?Math.max(-7,Math.min(7,v[k])):0;for(const k of ['shoot','dash','skill','throw','swap','reload','openChest','campInteract','interact'])out[k]=v[k]===true;if(v.command&&Number.isInteger(v.command.id)&&['shop','machine','equip','card','slot'].includes(v.command.type))out.command={id:v.command.id,type:v.command.type,value:typeof v.command.value==='string'?v.command.value.slice(0,40):int(v.command.value,0,1000000)};return out;}
export function normalizeCode(code){return String(code||'').trim().toUpperCase().replace(/[（]/g,'(').replace(/[）]/g,')')}
const letters='ABCDEFGHJKLMNPQRSTUVWXYZ',digits='0123456789',symbols='!@#$%+';
const choose=s=>s[crypto.getRandomValues(new Uint32Array(1))[0]%s.length];
export function mixedCode(){const a=[choose(letters),choose(digits),choose(symbols),choose(letters+digits+symbols),choose(letters+digits+symbols)];for(let i=4;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a.join('')}
export async function roomAPI(request,env){
 if(request.method!=='POST')return json({error:'请使用 POST 请求'},405);
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'来源不匹配'},403);
 if(!env.DB)return json({error:'房间服务尚未配置'},503);
 let b;try{const body=await request.text();if(body.length>700000)return json({error:'数据过大'},413);b=JSON.parse(body)}catch{return json({error:'请求格式错误'},400)}
 if(!b||typeof b!=='object')return json({error:'请求格式错误'},400);
 const action=new URL(request.url).pathname.split('/').at(-1),now=Date.now(),db=env.DB;
 if(action==='create'){
 const host=token(),seed=crypto.getRandomValues(new Uint32Array(1))[0];
 const special=['F','G'].includes(b.codeType)?b.codeType:null,count=special==='F'?10:100,offset=crypto.getRandomValues(new Uint32Array(1))[0]%count;
 for(let attempt=0;attempt<(special?count+30:30);attempt++){const code=special&&attempt<count?'('+special+')'+String((offset+attempt)%count).padStart(special==='F'?1:2,'0'):mixedCode();
 const result=await db.prepare(`INSERT INTO coop_rooms (code,host_token,host_role,host_health,seed,host_seen,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET host_token=excluded.host_token,guest_token=NULL,host_role=excluded.host_role,guest_role=NULL,host_health=excluded.host_health,guest_health=0,status='waiting',seed=excluded.seed,snapshot=NULL,guest_input=NULL,host_seq=0,guest_seq=0,host_seen=excluded.host_seen,guest_seen=0,created_at=excluded.created_at,expires_at=excluded.expires_at WHERE coop_rooms.expires_at<? OR coop_rooms.status='closed'`).bind(code,host,int(b.role,0,13),int(b.health,0,20),seed,now,now,now+1800000,now).run();if(result.meta.changes)return json({code,token:host,side:0,specialFallback:!!special&&attempt>=count});}
 return json({error:'房间已满，请稍后重试'},503);}
 b.code=normalizeCode(b.code);if(!/^(?:[A-Z0-9!@#$%+]{5}|\(F\)\d|\(G\)\d{2})$/.test(b.code))return json({error:'请输入 5 位混合号，或 (F)7 / (G)42 格式的特殊号'},400);
 let room=await db.prepare('SELECT * FROM coop_rooms WHERE code=?').bind(b.code).first();
 if(!room||room.expires_at<now||room.status==='closed')return json({error:'房间不存在、已关闭或已过期'},404);
 if(action==='join'){const guest=token();const result=await db.prepare("UPDATE coop_rooms SET guest_token=?,guest_role=?,guest_health=?,guest_seen=? WHERE code=? AND guest_token IS NULL AND status='waiting'").bind(guest,int(b.role,0,13),int(b.health,0,20),now,b.code).run();if(!result.meta.changes)return json({error:'房间已满或已经开始'},409);return json({code:b.code,token:guest,side:1});}
 const side=b.token===room.host_token?0:b.token===room.guest_token&&room.guest_token?1:-1;if(side<0)return json({error:'房间凭证无效'},403);
 if(action==='leave'){if(side===0)await db.prepare("UPDATE coop_rooms SET status='closed' WHERE code=?").bind(b.code).run();else if(room.status==='waiting')await db.prepare('UPDATE coop_rooms SET guest_token=NULL,guest_role=NULL,guest_seen=0 WHERE code=?').bind(b.code).run();else await db.prepare('UPDATE coop_rooms SET guest_seen=0 WHERE code=?').bind(b.code).run();return json({left:true});}
 if(action==='start'){if(side!==0||!room.guest_token)return json({error:'需要房主及一名队友才能开始'},409);await db.prepare("UPDATE coop_rooms SET status='playing' WHERE code=? AND status='waiting'").bind(b.code).run();}
 else if(action!=='exchange')return json({error:'接口不存在'},404);
 const seq=int(b.seq,0,Number.MAX_SAFE_INTEGER);
 if(side===0){let snapshot=null;if(b.snapshot&&typeof b.snapshot==='object'&&Array.isArray(b.snapshot.rooms)&&b.snapshot.player&&b.snapshot.partner)snapshot=JSON.stringify(b.snapshot);await db.prepare('UPDATE coop_rooms SET host_seen=?,expires_at=?,snapshot=CASE WHEN ?>host_seq AND ? IS NOT NULL THEN ? ELSE snapshot END,host_seq=MAX(host_seq,?) WHERE code=?').bind(now,now+1800000,seq,snapshot,snapshot,seq,b.code).run();}
 else{await db.prepare('UPDATE coop_rooms SET guest_seen=?,expires_at=?,guest_input=CASE WHEN ?>guest_seq THEN ? ELSE guest_input END,guest_seq=MAX(guest_seq,?) WHERE code=?').bind(now,now+1800000,seq,JSON.stringify(sanitizeInput(b.input)),seq,b.code).run();}
 room=await db.prepare('SELECT * FROM coop_rooms WHERE code=?').bind(b.code).first();
 return json({code:room.code,status:room.status,seed:room.seed,runId:room.code+'-'+room.created_at,hostRole:room.host_role,guestRole:room.guest_role,hostHealth:room.host_health,guestHealth:room.guest_health,peerOnline:now-(side?room.host_seen:room.guest_seen)<5000,guestPresent:!!room.guest_token,hostSeq:room.host_seq,guestSeq:room.guest_seq,input:side===0&&room.guest_input?JSON.parse(room.guest_input):null,snapshot:room.snapshot&&(side===1||b.restore)?JSON.parse(room.snapshot):null});
}
