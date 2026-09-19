const TILE = 32;
const ROWS = 15;

const LEVELS = [
// =================== WORLD 1 - SUNNY MEADOWS ===================
{
    name:"1-1", world:1, level:1, width:120, bg:'outdoor',
    ground:[{x:0,w:120}],
    blocks:[{x:16,y:10,type:'question',content:'mushroom'},{x:22,y:10,type:'brick'},{x:23,y:10,type:'question',content:'coin'},{x:24,y:10,type:'brick'}],
    enemies:[],
    coins:[{x:17,y:7},{x:18,y:7},{x:19,y:7}],
    powerups:[],platforms:[],checkpoints:[],
    goalX:118
},
{
    name:"1-2", world:1, level:2, width:130, bg:'outdoor',
    ground:[{x:0,w:45},{x:48,w:82}],
    blocks:[{x:12,y:10,type:'brick'},{x:13,y:10,type:'question',content:'coin'},{x:14,y:10,type:'brick'},{x:30,y:8,type:'question',content:'mushroom'},{x:60,y:10,type:'question',content:'coin'},{x:61,y:10,type:'brick'},{x:62,y:10,type:'question',content:'coin'}],
    enemies:[{x:20,y:12,type:'walker'},{x:55,y:12,type:'walker'}],
    coins:[{x:46,y:9},{x:47,y:9},{x:25,y:7},{x:26,y:7}],
    powerups:[],platforms:[{x:45,y:10,w:3}],checkpoints:[],
    goalX:128
},
{
    name:"1-3", world:1, level:3, width:140, bg:'outdoor',
    ground:[{x:0,w:35},{x:39,w:30},{x:72,w:68}],
    blocks:[{x:10,y:10,type:'question',content:'coin'},{x:15,y:10,type:'brick'},{x:16,y:10,type:'question',content:'mushroom'},{x:17,y:10,type:'brick'},{x:50,y:8,type:'brick'},{x:51,y:8,type:'question',content:'fire'},{x:52,y:8,type:'brick'},{x:80,y:10,type:'question',content:'coin'}],
    enemies:[{x:18,y:12,type:'walker'},{x:55,y:12,type:'walker'},{x:90,y:12,type:'walker'}],
    coins:[{x:36,y:9},{x:37,y:9},{x:38,y:9},{x:68,y:7},{x:69,y:7}],
    powerups:[],platforms:[{x:35,y:10,w:4},{x:67,y:9,w:5}],checkpoints:[{x:70,y:12}],
    goalX:138
},
{
    name:"1-4", world:1, level:4, width:150, bg:'outdoor',
    ground:[{x:0,w:30},{x:34,w:25},{x:62,w:20},{x:85,w:65}],
    blocks:[{x:8,y:10,type:'brick'},{x:9,y:10,type:'question',content:'coin'},{x:25,y:8,type:'question',content:'mushroom'},{x:42,y:10,type:'brick'},{x:43,y:10,type:'question',content:'coin'},{x:70,y:8,type:'question',content:'fire'},{x:95,y:10,type:'question',content:'coin'},{x:100,y:10,type:'brick'}],
    enemies:[{x:15,y:12,type:'walker'},{x:40,y:12,type:'walker'},{x:48,y:12,type:'walker'},{x:75,y:12,type:'flyer'},{x:105,y:12,type:'walker'}],
    coins:[{x:31,y:8},{x:32,y:7},{x:33,y:8},{x:58,y:7},{x:59,y:7},{x:110,y:7}],
    powerups:[],platforms:[{x:30,y:10,w:4},{x:58,y:9,w:4},{x:81,y:10,w:4}],checkpoints:[{x:80,y:12}],
    goalX:148
},
{
    name:"1-5", world:1, level:5, width:140, bg:'underground',
    ground:[{x:0,w:40},{x:43,w:35},{x:81,w:59}],
    blocks:[{x:5,y:8,type:'brick'},{x:7,y:8,type:'question',content:'mushroom'},{x:20,y:10,type:'question',content:'coin'},{x:22,y:10,type:'question',content:'coin'},{x:50,y:8,type:'brick'},{x:51,y:8,type:'question',content:'fire'},{x:90,y:10,type:'question',content:'coin'},{x:96,y:8,type:'question',content:'star'}],
    enemies:[{x:15,y:12,type:'walker'},{x:30,y:12,type:'walker'},{x:55,y:12,type:'walker'},{x:65,y:12,type:'walker'},{x:100,y:12,type:'flyer'}],
    coins:[{x:41,y:8},{x:42,y:7},{x:60,y:6},{x:61,y:6},{x:92,y:7}],
    powerups:[],platforms:[{x:40,y:10,w:3},{x:78,y:9,w:3}],checkpoints:[{x:78,y:12}],
    goalX:138
},
{
    name:"1-6", world:1, level:6, width:150, bg:'outdoor',
    ground:[{x:0,w:28},{x:31,w:22},{x:56,w:18},{x:77,w:73}],
    blocks:[{x:10,y:10,type:'question',content:'coin'},{x:12,y:10,type:'question',content:'coin'},{x:38,y:8,type:'brick'},{x:39,y:8,type:'question',content:'mushroom'},{x:62,y:10,type:'question',content:'fire'},{x:85,y:8,type:'question',content:'coin'},{x:91,y:10,type:'question',content:'star'},{x:110,y:8,type:'question',content:'coin'}],
    enemies:[{x:14,y:12,type:'walker'},{x:35,y:12,type:'walker'},{x:45,y:12,type:'walker'},{x:65,y:12,type:'flyer'},{x:80,y:12,type:'walker'},{x:100,y:12,type:'walker'}],
    coins:[{x:29,y:9},{x:53,y:7},{x:54,y:7},{x:75,y:8},{x:76,y:7}],
    powerups:[],platforms:[{x:28,y:10,w:3},{x:53,y:9,w:3},{x:74,y:10,w:3}],checkpoints:[{x:75,y:12}],
    goalX:148
},
{
    name:"1-7", world:1, level:7, width:140, bg:'outdoor',
    ground:[{x:0,w:25},{x:90,w:50}],
    blocks:[{x:8,y:10,type:'brick'},{x:9,y:10,type:'question',content:'coin'},{x:30,y:10,type:'brick'},{x:35,y:8,type:'brick'},{x:36,y:8,type:'question',content:'mushroom'},{x:45,y:6,type:'brick'},{x:46,y:6,type:'question',content:'fire'},{x:55,y:10,type:'question',content:'coin'},{x:65,y:8,type:'question',content:'coin'},{x:95,y:10,type:'question',content:'coin'}],
    enemies:[{x:12,y:12,type:'walker'},{x:95,y:12,type:'walker'},{x:105,y:12,type:'walker'},{x:50,y:5,type:'flyer'}],
    coins:[{x:26,y:8},{x:27,y:7},{x:28,y:6},{x:42,y:7},{x:60,y:5},{x:70,y:7}],
    powerups:[],platforms:[{x:25,y:11,w:3},{x:30,y:9,w:4},{x:35,y:7,w:3},{x:42,y:8,w:3},{x:48,y:6,w:4},{x:55,y:9,w:3},{x:60,y:7,w:4},{x:65,y:6,w:3},{x:72,y:8,w:3},{x:80,y:10,w:5},{x:86,y:9,w:4}],
    checkpoints:[{x:65,y:12}],
    goalX:138
},
{
    name:"1-8", world:1, level:8, width:160, bg:'outdoor',
    ground:[{x:0,w:22},{x:26,w:18},{x:47,w:15},{x:65,w:12},{x:80,w:80}],
    blocks:[{x:8,y:10,type:'question',content:'coin'},{x:30,y:8,type:'question',content:'mushroom'},{x:50,y:10,type:'question',content:'coin'},{x:56,y:8,type:'question',content:'fire'},{x:70,y:10,type:'question',content:'coin'},{x:91,y:8,type:'question',content:'star'},{x:110,y:10,type:'question',content:'coin'}],
    enemies:[{x:12,y:12,type:'walker'},{x:35,y:12,type:'walker'},{x:52,y:12,type:'walker'},{x:60,y:12,type:'flyer'},{x:85,y:12,type:'walker'},{x:95,y:12,type:'walker'},{x:105,y:12,type:'flyer'}],
    coins:[{x:23,y:8},{x:24,y:7},{x:44,y:7},{x:45,y:6},{x:62,y:8},{x:100,y:7},{x:101,y:7}],
    powerups:[],platforms:[{x:22,y:10,w:4},{x:42,y:9,w:5},{x:60,y:10,w:5},{x:76,y:9,w:4}],checkpoints:[{x:80,y:12}],
    goalX:158
},
{
    name:"1-9", world:1, level:9, width:160, bg:'outdoor',
    ground:[{x:0,w:20},{x:24,w:14},{x:41,w:12},{x:56,w:10},{x:69,w:10},{x:82,w:78}],
    blocks:[{x:6,y:10,type:'question',content:'coin'},{x:28,y:10,type:'brick'},{x:29,y:10,type:'question',content:'mushroom'},{x:45,y:8,type:'brick'},{x:46,y:8,type:'question',content:'fire'},{x:60,y:10,type:'question',content:'coin'},{x:72,y:8,type:'question',content:'coin'},{x:90,y:10,type:'question',content:'star'},{x:100,y:10,type:'brick'}],
    enemies:[{x:10,y:12,type:'walker'},{x:30,y:12,type:'walker'},{x:47,y:12,type:'walker'},{x:58,y:12,type:'flyer'},{x:75,y:12,type:'walker'},{x:88,y:12,type:'walker'},{x:95,y:12,type:'flyer'},{x:108,y:12,type:'walker'}],
    coins:[{x:21,y:8},{x:22,y:7},{x:38,y:8},{x:39,y:7},{x:53,y:8},{x:66,y:8},{x:79,y:7}],
    powerups:[],platforms:[{x:20,y:10,w:4},{x:38,y:10,w:3},{x:53,y:10,w:3},{x:66,y:10,w:3},{x:79,y:10,w:3}],checkpoints:[{x:80,y:12}],
    goalX:158
},
{
    name:"1-10", world:1, level:10, width:180, bg:'outdoor',
    ground:[{x:0,w:18},{x:22,w:12},{x:37,w:10},{x:50,w:8},{x:61,w:10},{x:74,w:8},{x:85,w:95}],
    blocks:[{x:5,y:10,type:'question',content:'coin'},{x:25,y:10,type:'brick'},{x:26,y:10,type:'question',content:'mushroom'},{x:40,y:8,type:'brick'},{x:41,y:8,type:'question',content:'fire'},{x:55,y:10,type:'question',content:'coin'},{x:65,y:8,type:'question',content:'coin'},{x:78,y:10,type:'brick'},{x:79,y:10,type:'question',content:'star'},{x:95,y:8,type:'question',content:'coin'},{x:100,y:10,type:'brick'},{x:110,y:8,type:'question',content:'coin'}],
    enemies:[{x:8,y:12,type:'walker'},{x:28,y:12,type:'walker'},{x:42,y:12,type:'walker'},{x:53,y:12,type:'flyer'},{x:64,y:12,type:'walker'},{x:88,y:12,type:'walker'},{x:95,y:12,type:'walker'},{x:105,y:12,type:'flyer'},{x:115,y:12,type:'walker'}],
    coins:[{x:19,y:8},{x:20,y:7},{x:34,y:8},{x:47,y:7},{x:58,y:8},{x:71,y:7},{x:82,y:7},{x:108,y:7}],
    powerups:[],platforms:[{x:18,y:10,w:4},{x:34,y:10,w:3},{x:47,y:10,w:3},{x:58,y:10,w:3},{x:71,y:10,w:3},{x:82,y:10,w:3}],checkpoints:[{x:80,y:12}],
    goalX:178
},
// =================== WORLD 2 - DESERT RUINS ===================
{
    name:"2-1", world:2, level:1, width:130, bg:'outdoor',
    ground:[{x:0,w:50},{x:54,w:76}],
    blocks:[{x:15,y:10,type:'brick'},{x:16,y:10,type:'question',content:'mushroom'},{x:17,y:10,type:'brick'},{x:40,y:8,type:'question',content:'coin'}],
    enemies:[{x:25,y:12,type:'walker'},{x:65,y:12,type:'walker'}],
    coins:[{x:51,y:9},{x:52,y:8},{x:53,y:9}],
    powerups:[],platforms:[{x:50,y:10,w:4}],checkpoints:[{x:60,y:12}],
    goalX:128
},
{
    name:"2-2", world:2, level:2, width:140, bg:'outdoor',
    ground:[{x:0,w:35},{x:39,w:25},{x:67,w:73}],
    blocks:[{x:10,y:10,type:'question',content:'coin'},{x:20,y:8,type:'brick'},{x:21,y:8,type:'question',content:'mushroom'},{x:45,y:10,type:'question',content:'fire'},{x:80,y:8,type:'brick'},{x:81,y:8,type:'question',content:'coin'}],
    enemies:[{x:15,y:12,type:'walker'},{x:50,y:12,type:'walker'},{x:75,y:12,type:'flyer'},{x:95,y:12,type:'walker'}],
    coins:[{x:36,y:8},{x:37,y:7},{x:64,y:9},{x:65,y:8},{x:66,y:9}],
    powerups:[],platforms:[{x:35,y:10,w:4},{x:63,y:10,w:4}],checkpoints:[{x:70,y:12}],
    goalX:138
},
{
    name:"2-3", world:2, level:3, width:150, bg:'outdoor',
    ground:[{x:0,w:25},{x:29,w:20},{x:52,w:18},{x:73,w:77}],
    blocks:[{x:8,y:10,type:'brick'},{x:9,y:10,type:'question',content:'coin'},{x:33,y:8,type:'question',content:'mushroom'},{x:57,y:10,type:'brick'},{x:58,y:10,type:'question',content:'fire'},{x:85,y:8,type:'question',content:'star'},{x:100,y:10,type:'brick'},{x:101,y:10,type:'question',content:'coin'}],
    enemies:[{x:12,y:12,type:'walker'},{x:40,y:12,type:'walker'},{x:60,y:12,type:'flyer'},{x:80,y:12,type:'walker'},{x:90,y:12,type:'walker'},{x:110,y:12,type:'flyer'}],
    coins:[{x:26,y:8},{x:27,y:7},{x:49,y:8},{x:50,y:7},{x:70,y:8},{x:71,y:7},{x:105,y:7}],
    powerups:[],platforms:[{x:25,y:10,w:4},{x:49,y:10,w:3},{x:69,y:10,w:4}],checkpoints:[{x:80,y:12}],
    goalX:148
},
{
    name:"2-4", world:2, level:4, width:160, bg:'outdoor',
    ground:[{x:0,w:20},{x:24,w:15},{x:42,w:12},{x:57,w:10},{x:70,w:90}],
    blocks:[{x:6,y:10,type:'question',content:'coin'},{x:28,y:8,type:'brick'},{x:29,y:8,type:'question',content:'mushroom'},{x:46,y:10,type:'question',content:'fire'},{x:62,y:8,type:'question',content:'coin'},{x:80,y:10,type:'brick'},{x:81,y:10,type:'question',content:'star'},{x:110,y:8,type:'brick'},{x:111,y:8,type:'question',content:'coin'}],
    enemies:[{x:10,y:12,type:'walker'},{x:32,y:12,type:'walker'},{x:50,y:12,type:'flyer'},{x:65,y:12,type:'walker'},{x:85,y:12,type:'walker'},{x:95,y:12,type:'flyer'},{x:105,y:12,type:'walker'}],
    coins:[{x:21,y:8},{x:22,y:7},{x:39,y:7},{x:40,y:6},{x:54,y:8},{x:67,y:7},{x:77,y:7},{x:100,y:7}],
    powerups:[],platforms:[{x:20,y:10,w:4},{x:39,y:10,w:3},{x:54,y:10,w:3},{x:67,y:10,w:3}],checkpoints:[{x:80,y:12}],
    goalX:158
},
// =================== WORLD 3 - MUSHROOM SKYLANDS ===================
{
    name:"3-1", world:3, level:1, width:140, bg:'outdoor',
    ground:[{x:0,w:30},{x:34,w:25},{x:62,w:78}],
    blocks:[{x:10,y:10,type:'question',content:'coin'},{x:15,y:8,type:'brick'},{x:16,y:8,type:'question',content:'mushroom'},{x:40,y:10,type:'question',content:'coin'},{x:70,y:8,type:'brick'},{x:71,y:8,type:'question',content:'fire'},{x:90,y:10,type:'question',content:'coin'}],
    enemies:[{x:18,y:12,type:'walker'},{x:48,y:12,type:'walker'},{x:75,y:12,type:'flyer'},{x:100,y:12,type:'walker'}],
    coins:[{x:31,y:9},{x:32,y:8},{x:59,y:8},{x:60,y:7},{x:85,y:7},{x:86,y:6}],
    powerups:[],platforms:[{x:30,y:10,w:4},{x:59,y:10,w:3},{x:82,y:10,w:4}],checkpoints:[{x:75,y:12}],
    goalX:138
},
{
    name:"3-2", world:3, level:2, width:150, bg:'outdoor',
    ground:[{x:0,w:22},{x:26,w:18},{x:47,w:15},{x:65,w:12},{x:80,w:70}],
    blocks:[{x:8,y:10,type:'question',content:'coin'},{x:30,y:8,type:'brick'},{x:31,y:8,type:'question',content:'mushroom'},{x:52,y:10,type:'question',content:'fire'},{x:70,y:8,type:'question',content:'coin'},{x:90,y:10,type:'brick'},{x:91,y:10,type:'question',content:'star'},{x:105,y:8,type:'question',content:'coin'}],
    enemies:[{x:12,y:12,type:'walker'},{x:35,y:12,type:'walker'},{x:55,y:12,type:'flyer'},{x:72,y:12,type:'walker'},{x:88,y:12,type:'walker'},{x:100,y:12,type:'flyer'}],
    coins:[{x:23,y:8},{x:24,y:7},{x:44,y:7},{x:45,y:6},{x:62,y:8},{x:77,y:7},{x:95,y:7}],
    powerups:[],platforms:[{x:22,y:10,w:4},{x:42,y:9,w:5},{x:60,y:10,w:5},{x:76,y:9,w:4}],checkpoints:[{x:80,y:12}],
    goalX:148
},
{
    name:"3-3", world:3, level:3, width:160, bg:'outdoor',
    ground:[{x:0,w:18},{x:22,w:14},{x:39,w:12},{x:54,w:10},{x:67,w:10},{x:80,w:80}],
    blocks:[{x:6,y:10,type:'question',content:'coin'},{x:26,y:8,type:'brick'},{x:27,y:8,type:'question',content:'mushroom'},{x:43,y:10,type:'brick'},{x:44,y:10,type:'question',content:'fire'},{x:58,y:8,type:'question',content:'coin'},{x:72,y:10,type:'brick'},{x:73,y:10,type:'question',content:'star'},{x:95,y:8,type:'question',content:'coin'},{x:110,y:10,type:'brick'}],
    enemies:[{x:10,y:12,type:'walker'},{x:30,y:12,type:'walker'},{x:48,y:12,type:'walker'},{x:60,y:12,type:'flyer'},{x:78,y:12,type:'walker'},{x:90,y:12,type:'walker'},{x:100,y:12,type:'flyer'},{x:115,y:12,type:'walker'}],
    coins:[{x:19,y:8},{x:20,y:7},{x:36,y:8},{x:37,y:7},{x:51,y:8},{x:64,y:8},{x:76,y:7},{x:98,y:7}],
    powerups:[],platforms:[{x:18,y:10,w:4},{x:36,y:10,w:3},{x:51,y:10,w:3},{x:64,y:10,w:3},{x:76,y:10,w:3}],checkpoints:[{x:80,y:12}],
    goalX:158
},
{
    name:"3-4", world:3, level:4, width:170, bg:'outdoor',
    ground:[{x:0,w:16},{x:20,w:12},{x:35,w:10},{x:48,w:8},{x:59,w:10},{x:72,w:8},{x:83,w:87}],
    blocks:[{x:5,y:10,type:'question',content:'coin'},{x:24,y:8,type:'brick'},{x:25,y:8,type:'question',content:'mushroom'},{x:39,y:10,type:'brick'},{x:40,y:10,type:'question',content:'fire'},{x:53,y:8,type:'question',content:'coin'},{x:63,y:10,type:'brick'},{x:64,y:10,type:'question',content:'star'},{x:76,y:8,type:'question',content:'coin'},{x:90,y:10,type:'brick'},{x:91,y:10,type:'question',content:'coin'},{x:110,y:8,type:'question',content:'coin'}],
    enemies:[{x:8,y:12,type:'walker'},{x:28,y:12,type:'walker'},{x:42,y:12,type:'walker'},{x:56,y:12,type:'flyer'},{x:66,y:12,type:'walker'},{x:79,y:12,type:'walker'},{x:95,y:12,type:'flyer'},{x:105,y:12,type:'walker'},{x:115,y:12,type:'walker'}],
    coins:[{x:17,y:8},{x:18,y:7},{x:32,y:8},{x:45,y:7},{x:56,y:8},{x:69,y:7},{x:80,y:7},{x:100,y:7},{x:108,y:7}],
    powerups:[],platforms:[{x:16,y:10,w:4},{x:32,y:10,w:3},{x:45,y:10,w:3},{x:56,y:10,w:3},{x:69,y:10,w:3},{x:80,y:10,w:3}],checkpoints:[{x:90,y:12}],
    goalX:168
}
];
