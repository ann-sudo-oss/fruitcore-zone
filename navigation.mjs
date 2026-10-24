import {insideArena,constrain} from './arena.mjs?v=20';
import {OBSTACLES,distance} from './core.mjs?v=20';
export function findPath(game,target){
const objects=[...game.obstacles,...game.destructibles.filter(o=>o.hp>0)];
const clear=p=>insideArena(p,game.room.arena,.5)&&objects.every(o=>distance(p,o)>o.r+.44);
const segment=(a,b)=>{const steps=Math.ceil(distance(a,b)*5);for(let i=1;i<=steps;i++)if(!clear({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps}))return false;return true};
const start={x:Math.round(game.player.x),y:Math.round(game.player.y)},goal=constrain({x:Math.round(target.x),y:Math.round(target.y)},game.room.arena,.6);const candidates=[];for(let x=-13;x<=13;x++)for(let y=-11;y<=11;y++)if(clear({x,y}))candidates.push({x,y});candidates.sort((a,b)=>distance(a,target)-distance(b,target));if(!candidates.length)return [];Object.assign(goal,candidates[0]);const first=[...candidates].sort((a,b)=>distance(a,game.player)-distance(b,game.player)).find(p=>segment(game.player,p));if(!first)return [];Object.assign(start,first);
const key=p=>p.x+','+p.y,queue=[start],came=new Map([[key(start),null]]),cost=new Map([[key(start),0]]);let found=false;
while(queue.length){queue.sort((a,b)=>cost.get(key(a))+distance(a,goal)-cost.get(key(b))-distance(b,goal));const current=queue.shift();if(key(current)===key(goal)){found=true;break}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const next={x:current.x+dx,y:current.y+dy};if(!clear(next)||!segment(current,next))continue;const n=cost.get(key(current))+Math.hypot(dx,dy);if(n<(cost.get(key(next))??Infinity)){cost.set(key(next),n);came.set(key(next),current);queue.push(next)}}}
if(!found)return [];const path=[];let p=goal;while(p&&key(p)!==key(start)){path.unshift(p);p=came.get(key(p))}if(distance(game.player,start)>.2)path.unshift(start);return path;
}
