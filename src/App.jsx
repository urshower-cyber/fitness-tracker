import { useState, useEffect, useRef } from "react";

// ── 常數定義 ────────────────────────────────────────────────────
const TYPES = [
  { id: "胸", label: "胸部", emoji: "🔴", color: "#ef4444", light: "#3f1515" },
  { id: "背", label: "背部", emoji: "🔵", color: "#3b82f6", light: "#0f2744" },
  { id: "肩", label: "肩部", emoji: "🟢", color: "#22c55e", light: "#0f2a1a" },
  { id: "腿", label: "腿部", emoji: "🟡", color: "#eab308", light: "#2a2200" },
  { id: "手臂", label: "手臂", emoji: "🟤", color: "#d97706", light: "#2a1a00" },
  { id: "核心", label: "核心", emoji: "🟠", color: "#f97316", light: "#2a1800" },
  { id: "腹肌", label: "腹肌", emoji: "🟣", color: "#a855f7", light: "#200c3a" },
  { id: "有氧", label: "有氧", emoji: "🏃", color: "#14b8a6", light: "#032a28" },
];
const BASE_EXERCISES = {
  胸: ["啞鈴-臥推","啞鈴-上斜臥推","槓鈴-臥推","槓鈴-上斜臥推","機械-飛鳥","機械-下斜推胸","機械-上胸推舉","機械-坐姿胸推","機械-臥推","機械-Dip","滑輪-飛鳥","其他-史密斯臥推","其他-史密斯上斜臥推"],
  背: ["啞鈴-划船","槓鈴-划船(拉向肚臍)","機械-滑輪下拉","機械-反手下拉","機械-划船","機械-引體向上","滑輪-直臂下拉","滑輪-划船","其他-地雷管T-BAR划船","其他-引體向上"],
  肩: ["啞鈴-肩推","啞鈴-阿諾肩推","啞鈴-側平舉","啞鈴-俯身反飛鳥","槓鈴-划船(拉向胸口)","機械-肩推","機械-側平舉","機械-反飛鳥","滑輪-側平舉","滑輪-臉拉"],
  腿: ["啞鈴-保加利亞分腿蹲","槓鈴-高背槓深蹲","槓鈴-羅馬尼亞硬舉","機械-斜上腿推","機械-雙腿伸展","機械-坐姿腿部屈伸","機械-趴姿腿部屈伸","機械-臀推","機械-髖內收","機械-髖外展","機械-深蹲","機械-哈克深蹲"],
  手臂: ["啞鈴-二頭彎舉","啞鈴-三頭頸後臂屈伸","槓鈴-W槓二頭彎舉","機械-雙槓撐體機(三頭)","滑輪-二頭彎舉","滑輪-三頭下壓(繩索/直槓)","徒手-板凳三頭撐體"],
  核心: ["壺鈴-盪壺","其他-農夫走路","徒手-死蟲","徒手-棒式"],
  腹肌: ["機械-捲腹","其他-懸吊抬腿"],
  有氧: ["跑步機","登階機","腳踏車","步行"],
};
const BODYWEIGHT = new Set(["徒手-死蟲","徒手-棒式","徒手-板凳三頭撐體"]);
const CARDIO = new Set(["跑步機","登階機","腳踏車","步行"]);
// 判斷是否為徒手動作（名稱含「徒手」即為徒手，不顯示重量欄位）
function isBodyweightExercise(name) {
  return name ? name.includes("徒手") : false;
}
const REPS_PRESETS = [6, 8, 10, 12, 14];
const WEEKDAYS_FULL = ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];
const WEEKDAYS_SHORT = ["日","一","二","三","四","五","六"];
const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const MONTHLY_FEE = 1088;
const STORAGE_KEY = "fitness_v2";
const SCRIPT_URL_KEY = "fitness_script_url";
const LAST_SYNC_KEY = "fitness_last_sync";

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayStr() { return toDateStr(new Date()); }
function fmtTime(d) { return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveLocal(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function hexToRgb(hex) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// ── 主 App ─────────────────────────────────────────────────────
export default function FitnessTracker() {
  const stored = loadLocal();
  const [log, setLog] = useState(stored.log || {});
  const [customEx, setCustomEx] = useState(stored.customEx || {});
  const [unit, setUnit] = useState(stored.unit || "kg");
  const [weeklyGoal, setWeeklyGoal] = useState(stored.weeklyGoal || 4);

  // Google Sheets 同步
  const [scriptUrl, setScriptUrl] = useState(() => localStorage.getItem(SCRIPT_URL_KEY) || "");
  const [scriptUrlInput, setScriptUrlInput] = useState(() => localStorage.getItem(SCRIPT_URL_KEY) || "");
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | 'ok' | 'error'
  const [lastSync, setLastSync] = useState(() => localStorage.getItem(LAST_SYNC_KEY) || null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState(null);

  // UI
  const [screen, setScreen] = useState("calendar");
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selType, setSelType] = useState(null);
  const [selExercise, setSelExercise] = useState(null);
  const [sets, setSets] = useState([{ weight: "", reps: "", unit: stored.unit || "kg" }]);
  const [cardioData, setCardioData] = useState({ incline: "", speed: "", duration: "" });
  const [sessionStart, setSessionStart] = useState(null);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [pendingCustom, setPendingCustom] = useState(null);
  const [restTimer, setRestTimer] = useState(null);
  const [restPreset, setRestPreset] = useState(90);
  const [showPR, setShowPR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false); // {date, idx}

  useEffect(() => {
    if (!restTimer || restTimer.remaining <= 0) return;
    const t = setTimeout(() => setRestTimer(p => p ? { ...p, remaining: p.remaining - 1 } : null), 1000);
    return () => clearTimeout(t);
  }, [restTimer]);

  useEffect(() => {
    saveLocal({ log, customEx, unit, weeklyGoal, version: 2 });
  }, [weeklyGoal]);

  // ── 草稿自動儲存 ───────────────────────────────────────────
  // 開啟 App 時檢查是否有未完成的訓練
  useEffect(() => {
    try {
      const raw = localStorage.getItem('fitness_draft');
      if (!raw) return;
      const d = JSON.parse(raw);
      const hoursDiff = (Date.now() - new Date(d.savedAt)) / 3600000;
      if (hoursDiff < 24 && d.selExercise) {
        setDraftData(d);
        setShowDraftBanner(true);
      } else {
        localStorage.removeItem('fitness_draft');
      }
    } catch {}
  }, []);

  // 有在記錄中就自動存草稿
  useEffect(() => {
    if (!['logSets','cardio','selectExercise','selectType'].includes(screen)) return;
    const draft = { screen, selType, selExercise, sets, cardioData, selectedDate, savedAt: new Date().toISOString() };
    try { localStorage.setItem('fitness_draft', JSON.stringify(draft)); } catch {}
  }, [screen, selType, selExercise, sets, cardioData, selectedDate]);

  function restoreDraft() {
    if (!draftData) return;
    setSelType(draftData.selType);
    setSelExercise(draftData.selExercise);
    setSets(draftData.sets || [{ weight: '', reps: '', unit }]);
    setCardioData(draftData.cardio || { incline: '', speed: '', duration: '' });
    setSelectedDate(draftData.selectedDate || todayStr());
    setScreen(draftData.screen || 'logSets');
    setShowDraftBanner(false);
    setDraftData(null);
  }

  function discardDraft() {
    localStorage.removeItem('fitness_draft');
    setShowDraftBanner(false);
    setDraftData(null);
  }

  function clearDraft() {
    localStorage.removeItem('fitness_draft');
  }

  // ── Google Sheets 同步函式 ──────────────────────────────────
  async function syncToSheets(fullData, url) {
    const target = (url || scriptUrl).trim();
    if (!target) return;
    setSyncStatus('syncing');
    try {
      await fetch(target, {
        method: 'POST',
        mode: 'no-cors',      // 繞過 CORS，無法讀取回應，但資料確實送出
        body: JSON.stringify(fullData)
      });
      const t = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      setLastSync(t);
      localStorage.setItem(LAST_SYNC_KEY, t);
      setSyncStatus('ok');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus(null), 3000);
    }
  }

  async function loadFromSheets() {
    const target = scriptUrl.trim();
    if (!target) return null;
    try {
      const res = await fetch(target, { signal: AbortSignal.timeout(10000) });
      const text = await res.text();
      const json = JSON.parse(text);
      if (json && json.version) return json;
      return null;
    } catch { return null; }
  }

  function saveScriptUrl() {
    const url = scriptUrlInput.trim();
    setScriptUrl(url);
    localStorage.setItem(SCRIPT_URL_KEY, url);
    if (url) {
      // 立即同步一次
      const fullData = { log, customEx, unit, weeklyGoal, version: 2 };
      syncToSheets(fullData, url);
    }
  }

  async function handleRestoreFromSheets() {
    setRestoring(true); setRestoreMsg(null);
    const data = await loadFromSheets();
    if (data && data.log && Object.keys(data.log).length > 0) {
      // Sheets 有資料才覆蓋
      setLog(data.log || {}); setCustomEx(data.customEx || {});
      setUnit(data.unit || "kg"); setWeeklyGoal(data.weeklyGoal || 4);
      saveLocal(data);
      setRestoreMsg(`✅ 還原成功！共 ${Object.keys(data.log).length} 天的紀錄。`);
    } else if (data && data.version) {
      // Sheets 有回應但是空的
      setRestoreMsg("⚠️ Google Sheets 目前是空的，取消還原以保護本機資料。");
    } else {
      setRestoreMsg("❌ 無法讀取，請確認網址正確，或 Sheets 腳本已部署。");
    }
    setRestoring(false);
    setTimeout(() => setRestoreMsg(null), 5000);
  }

  // ── 輔助函式 ───────────────────────────────────────────────
  const typeInfo = t => TYPES.find(x => x.id === t);
  const ti = typeInfo(selType);
  function allExercises(type) { return [...(BASE_EXERCISES[type] || []), ...(customEx[type] || [])]; }
  function getLastSession(exercise) {
    const dates = Object.keys(log).sort().reverse();
    for (const d of dates) { const s = log[d]?.find(s => s.exercise === exercise); if (s) return s; }
    return null;
  }
  function checkPR(exercise, newSets, u) {
    const last = getLastSession(exercise); if (!last) return false;
    const toKg = (w, u2) => u2 === "lbs" ? parseFloat(w)*0.453592 : parseFloat(w);
    const prevMax = Math.max(...(last.sets||[]).map(s => toKg(s.weight, s.unit||last.unit||"kg")));
    const newMax = Math.max(...newSets.map(s => toKg(s.weight, s.unit||u)));
    return newMax > prevMax && prevMax > 0;
  }
  function deleteSession(dateStr, idx) {
    const newLog = { ...log };
    newLog[dateStr] = newLog[dateStr].filter((_, i) => i !== idx);
    if (newLog[dateStr].length === 0) delete newLog[dateStr];
    setLog(newLog);
    const fullData = { log: newLog, customEx, unit, weeklyGoal, version: 2 };
    saveLocal(fullData);
    syncToSheets(fullData);
    setDeleteConfirm(null);
  }
  function monthVisits() {
    const y=viewMonth.getFullYear(), m=viewMonth.getMonth();
    return Object.keys(log).filter(d=>{ const dt=new Date(d+"T00:00:00"); return dt.getFullYear()===y&&dt.getMonth()===m; }).length;
  }
  function weekVisits() {
    const now=new Date(), start=new Date(now); start.setDate(now.getDate()-now.getDay());
    const end=new Date(start); end.setDate(start.getDate()+6);
    return Object.keys(log).filter(d=>{ const dt=new Date(d+"T00:00:00"); return dt>=start&&dt<=end; }).length;
  }
  function calendarDays() {
    const y=viewMonth.getFullYear(), m=viewMonth.getMonth();
    const first=new Date(y,m,1).getDay(), total=new Date(y,m+1,0).getDate();
    const days=[];
    for(let i=0;i<first;i++) days.push(null);
    for(let i=1;i<=total;i++) days.push(i);
    return days;
  }
  function dayTypes(ds) { return (log[ds]||[]).map(s=>s.type).filter((v,i,a)=>a.indexOf(v)===i); }

  // ── 儲存訓練 ──────────────────────────────────────────────
  function handleSave() {
    const isCardio=CARDIO.has(selExercise), isBW=isBodyweightExercise(selExercise);
    const isPR=!isCardio&&!isBW&&checkPR(selExercise,sets,unit);
    const duration=sessionStart?Math.round((Date.now()-sessionStart)/60000):null;
    const session={
      type:selType, exercise:selExercise,
      sets:isCardio?[]:sets.map(s=>({weight:s.weight,reps:s.reps,unit:s.unit||unit})),
      cardio:isCardio?cardioData:null, isCardio, isBodyweight:isBW, unit,
      startTime:sessionStart?fmtTime(new Date(sessionStart)):null,
      duration, savedAt:new Date().toISOString()
    };
    const newLog={...log};
    if(!newLog[selectedDate]) newLog[selectedDate]=[];
    newLog[selectedDate]=[...newLog[selectedDate],session];
    setLog(newLog);
    const fullData={log:newLog,customEx,unit,weeklyGoal,version:2};
    saveLocal(fullData);
    syncToSheets(fullData);
    clearDraft(); // 背景同步到 Sheets
    if(isPR){setShowPR(true);setTimeout(()=>setShowPR(false),3000);}
    setTimeout(()=>{resetSession();setScreen("dayDetail");},400);
  }

  function resetSession() {
    setSelType(null);setSelExercise(null);setSets([{weight:"",reps:"",unit}]);
    setCardioData({incline:"",speed:"",duration:""});setSessionStart(null);
    setCustomInput("");setShowCustomInput(false);setPendingCustom(null);setRestTimer(null);
    clearDraft();
  }
  function addSet() {
    const last=sets[sets.length-1];
    setSets(p=>[...p,{weight:last.weight,reps:last.reps,unit:last.unit||unit}]);
    setRestTimer({total:restPreset,remaining:restPreset});
  }
  function applyLastSession(last) {
    setSets(last.sets.map(s=>({weight:s.weight,reps:s.reps,unit:s.unit||last.unit||unit})));
  }
  function copyDaySummary(ds) {
    const sessions=log[ds]||[], d=new Date(ds+"T00:00:00");
    const label=`${ds.replace(/-/g,"/")} (${WEEKDAYS_FULL[d.getDay()]})`;
    let text=`💪 ${label} 訓練紀錄\n${"─".repeat(28)}\n\n`;
    sessions.forEach((s,idx)=>{
      const t=typeInfo(s.type);
      text+=`${t?.emoji} ${t?.label}｜${s.exercise}\n`;
      if(s.isCardio&&s.cardio) text+=`  坡度 ${s.cardio.incline}%・速度 ${s.cardio.speed}kph・${s.cardio.duration}分鐘\n`;
      else (s.sets||[]).forEach((st,i)=>{ text+=s.isBodyweight?`  第${i+1}組：${st.reps}次\n`:`  第${i+1}組：${st.weight} ${st.unit||s.unit||"kg"} × ${st.reps}次\n`; });
      if(s.duration) text+=`  ⏱ 訓練時長：${s.duration}分鐘\n`;
      if(idx<sessions.length-1) text+="\n";
    });
    const totalSets=sessions.reduce((a,s)=>a+(s.sets?.length||0),0);
    text+=`\n${"─".repeat(28)}\n共 ${sessions.length} 個項目 · ${totalSets} 組`;
    navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  }
  function exportData() {
    const data={log,customEx,unit,weeklyGoal,version:2};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url;a.download=`健身紀錄_${todayStr()}.json`;a.click();URL.revokeObjectURL(url);
  }
  function importData(e) {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try {
        const data=JSON.parse(ev.target.result);
        setLog(data.log||{});setCustomEx(data.customEx||{});setUnit(data.unit||"kg");setWeeklyGoal(data.weeklyGoal||4);
        saveLocal(data);setImportMsg("✅ 匯入成功！");setTimeout(()=>setImportMsg(null),2500);
      } catch { setImportMsg("❌ 檔案格式錯誤");setTimeout(()=>setImportMsg(null),2500); }
    };
    reader.readAsText(file);e.target.value="";
  }
  function saveCustomExercise(ex,type) {
    const n={...customEx,[type]:[...(customEx[type]||[]),ex]};
    setCustomEx(n);saveLocal({log,customEx:n,unit,weeklyGoal,version:2});
  }
  function selectExercise(ex) {
    setSelExercise(ex);setSets([{weight:"",reps:"",unit}]);
    if(!sessionStart) setSessionStart(Date.now());
    setScreen(CARDIO.has(ex)?"cardio":"logSets");
  }
  function handleCustomSubmit() {
    const ex=customInput.trim(); if(!ex) return;
    setPendingCustom(ex);setCustomInput("");setShowCustomInput(false);
  }

  // ── 色彩系統 ──────────────────────────────────────────────
  const C={bg:"#060c20",card:"rgba(6,14,50,0.78)",border:"rgba(96,165,250,0.22)",text:"#f0f0f8",muted:"#8899cc",accent:"#60a5fa"};
  const css={
    app:{backgroundImage:"url('/background.jpg')",backgroundSize:"cover",backgroundPosition:"center",backgroundAttachment:"fixed",backgroundColor:C.bg,minHeight:"100dvh",fontFamily:"'Inter','Noto Sans TC',sans-serif",color:C.text,maxWidth:500,margin:"0 auto",display:"flex",flexDirection:"column"},
    header:{padding:"18px 18px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"rgba(4,10,35,0.88)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",zIndex:10},
    title:{fontSize:22,fontWeight:800,letterSpacing:"-0.4px"},
    body:{flex:1,padding:"16px 18px 32px",overflowY:"auto"},
    backBtn:{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer",padding:"0 0 14px",display:"flex",alignItems:"center",gap:4},
    statRow:{display:"flex",gap:10,marginBottom:16},
    statCard:a=>({flex:1,background:C.card,backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",borderTop:`3px solid ${a}`}),
    statNum:{fontSize:30,fontWeight:800,lineHeight:1},
    statLabel:{fontSize:18,color:C.muted,marginTop:3},
    monthNav:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12},
    monthLabel:{fontSize:18,fontWeight:700},
    navBtn:{background:"rgba(6,14,50,0.7)",backdropFilter:"blur(8px)",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:18,cursor:"pointer",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"},
    calGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3},
    dayHeader:{textAlign:"center",fontSize:18,color:C.muted,padding:"4px 0",fontWeight:600},
    dayCell:(isToday,isSel,hasData,isFuture)=>({aspectRatio:"1",borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"5px 2px 4px",cursor:!isFuture?"pointer":"default",background:isSel?"rgba(96,165,250,0.25)":isToday?"rgba(96,165,250,0.12)":"rgba(4,10,30,0.35)",border:`1px solid ${isSel?C.accent:isToday?"rgba(96,165,250,0.5)":"transparent"}`,opacity:isFuture&&!hasData?0.3:1}),
    dayNum:t=>({fontSize:18,fontWeight:t?800:500,color:t?C.accent:C.text,lineHeight:1}),
    dotRow:{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center",marginTop:3},
    dot:c=>({width:6,height:6,borderRadius:"50%",background:c,flexShrink:0}),
    typeGrid:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8},
    typeCard:(t,a)=>({padding:"14px 12px",borderRadius:12,cursor:"pointer",background:a?`rgba(${hexToRgb(t.color)},0.2)`:C.card,backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",border:`1.5px solid ${a?t.color:C.border}`,display:"flex",alignItems:"center",gap:10}),
    exList:{display:"flex",flexDirection:"column",gap:6},
    exItem:(a,c)=>({padding:"13px 16px",borderRadius:10,cursor:"pointer",background:a?"rgba(96,165,250,0.15)":C.card,backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",border:`1.5px solid ${a?c:C.border}`,fontSize:18,color:a?C.text:C.muted}),
    prevCard:{background:"rgba(4,20,60,0.82)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",border:`1px solid rgba(96,165,250,0.3)`,borderRadius:12,padding:"14px 16px",marginBottom:14},
    setRow:{display:"flex",alignItems:"center",gap:8,marginBottom:8},
    setLabel:{fontSize:18,fontWeight:700,color:C.muted,minWidth:48},
    input:{flex:1,padding:"11px 12px",borderRadius:8,background:"rgba(4,10,40,0.8)",border:`1.5px solid ${C.border}`,color:C.text,fontSize:18,outline:"none",textAlign:"center"},
    repsRow:{display:"flex",gap:5,marginBottom:6},
    repBtn:(a,c)=>({flex:1,padding:"10px 0",borderRadius:8,border:`1.5px solid ${a?c:C.border}`,background:a?"rgba(96,165,250,0.15)":C.card,color:a?c:C.muted,fontSize:18,fontWeight:700,cursor:"pointer"}),
    unitToggle:{display:"flex",background:"rgba(4,10,40,0.7)",borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden"},
    unitBtn:a=>({flex:1,padding:"7px 10px",border:"none",background:a?C.accent:"transparent",color:a?"#060c20":C.muted,fontWeight:700,fontSize:18,cursor:"pointer"}),
    mainBtn:(c,d)=>({width:"100%",padding:"16px",borderRadius:12,border:"none",background:d?"rgba(20,30,70,0.6)":c,color:d?C.muted:"#060c20",fontSize:18,fontWeight:800,cursor:d?"not-allowed":"pointer",marginTop:10}),
    smBtn:c=>({padding:"9px 16px",borderRadius:8,border:`1.5px solid ${c}`,background:"transparent",color:c,fontSize:18,fontWeight:700,cursor:"pointer"}),
    divider:{height:1,background:C.border,margin:"14px 0"},
    restBox:{background:"rgba(4,20,60,0.85)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",border:`1px solid rgba(96,165,250,0.3)`,borderRadius:12,padding:"14px",marginBottom:12,textAlign:"center"},
    sectionLabel:{fontSize:18,fontWeight:700,color:C.muted,letterSpacing:"1px",textTransform:"uppercase",marginBottom:8,marginTop:14},
    badge:t=>({display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,background:`rgba(${hexToRgb(t.color)},0.2)`,color:t.color,fontSize:18,fontWeight:700,marginBottom:12}),
    prBanner:{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:"#eab308",color:"#060c20",padding:"12px 24px",borderRadius:20,fontWeight:800,fontSize:18,zIndex:999,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(234,179,8,0.4)"},
    overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:24},
    modal:{background:"rgba(6,14,50,0.95)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:16,padding:24,width:"100%",maxWidth:340,border:`1px solid ${C.border}`},
    syncDot:s=>({width:8,height:8,borderRadius:"50%",background:s==='ok'?"#22c55e":s==='error'?"#ef4444":"#eab308",display:"inline-block",marginRight:4}),
  };

  // ── 設定畫面 ──────────────────────────────────────────────
  if(showSettings) return (
    <div style={css.app}>
      <div style={css.header}><div style={css.title}>⚙️ 設定與備份</div></div>
      <div style={css.body}>
        <button style={css.backBtn} onClick={()=>setShowSettings(false)}>← 返回</button>

        {/* Google Sheets 同步 */}
        <div style={css.sectionLabel}>☁️ Google Sheets 雲端同步</div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:10}}>
          <div style={{fontSize:18,color:C.muted,marginBottom:12,lineHeight:1.6}}>
            將 Google Apps Script 部署後，把產生的網址貼在下方，即可自動同步訓練資料到你的 Google 試算表。
          </div>
          <input
            style={{...css.input,textAlign:"left",marginBottom:10,fontSize:18,width:"100%"}}
            placeholder="https://script.google.com/macros/s/xxxxx/exec"
            value={scriptUrlInput}
            onChange={e=>setScriptUrlInput(e.target.value)}
          />
          <div style={{display:"flex",gap:8}}>
            <button style={{...css.smBtn(C.accent),flex:1}} onClick={saveScriptUrl}>
              儲存網址
            </button>
            {scriptUrl&&(
              <button style={{...css.smBtn("#22c55e"),flex:1}}
                onClick={()=>syncToSheets({log,customEx,unit,weeklyGoal,version:2})}>
                {syncStatus==='syncing'?"同步中…":"立即同步"}
              </button>
            )}
          </div>
          {syncStatus&&(
            <div style={{marginTop:10,fontSize:18,color:syncStatus==='ok'?"#4ade80":syncStatus==='error'?"#f87171":"#eab308"}}>
              <span style={css.syncDot(syncStatus)}/>
              {syncStatus==='syncing'?"同步中…":syncStatus==='ok'?"同步成功！":"同步失敗，請檢查網址"}
            </div>
          )}
          {lastSync&&!syncStatus&&(
            <div style={{marginTop:8,fontSize:18,color:C.muted}}>上次同步：{lastSync}</div>
          )}
        </div>

        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:10}}>
          <div style={{fontWeight:700,marginBottom:6}}>🔄 從 Google Sheets 還原資料</div>
          <div style={{fontSize:18,color:C.muted,marginBottom:12}}>換新手機或資料遺失時，從雲端把資料載回來。注意：會覆蓋目前本機資料。</div>
          <button style={css.smBtn("#60a5fa")} onClick={handleRestoreFromSheets} disabled={!scriptUrl||restoring}>
            {restoring?"讀取中…":"從 Sheets 還原"}
          </button>
          {restoreMsg&&<div style={{marginTop:10,fontSize:18,color:restoreMsg.startsWith("✅")?"#4ade80":"#f87171"}}>{restoreMsg}</div>}
        </div>

        {/* 本機備份 */}
        <div style={css.sectionLabel}>💾 本機備份</div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:10}}>
          <div style={{fontWeight:700,marginBottom:6}}>📤 匯出資料</div>
          <div style={{fontSize:18,color:C.muted,marginBottom:12}}>下載所有訓練紀錄為 JSON 備份檔。</div>
          <button style={css.smBtn(C.accent)} onClick={exportData}>下載備份檔案</button>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:10}}>
          <div style={{fontWeight:700,marginBottom:6}}>📥 匯入資料</div>
          <div style={{fontSize:18,color:C.muted,marginBottom:12}}>從備份檔還原（會覆蓋現有資料）。</div>
          <input type="file" accept=".json" style={{display:"none"}} id="fileInput" onChange={importData}/>
          <button style={css.smBtn("#f97316")} onClick={()=>document.getElementById('fileInput').click()}>選取備份檔</button>
          {importMsg&&<div style={{marginTop:10,fontSize:18,color:importMsg.startsWith("✅")?"#4ade80":"#f87171"}}>{importMsg}</div>}
        </div>

        <div style={css.sectionLabel}>關於</div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:18,color:C.muted,lineHeight:1.7}}>💪 健身紀錄 v2.0<br/>月費：NT${MONTHLY_FEE.toLocaleString()}<br/>資料儲存於本機 + Google Sheets</div>
        </div>
      </div>
    </div>
  );

  // ── 月曆 ──────────────────────────────────────────────────
  if(screen==="calendar"){
    const days=calendarDays(), visits=monthVisits(), today=todayStr();
    const costPerVisit=visits>0?(MONTHLY_FEE/visits).toFixed(1):null;
    return(
      <div style={css.app}>
        {showPR&&<div style={css.prBanner}>🏆 新個人最佳紀錄！</div>}
        {showDraftBanner&&draftData&&(
          <div style={{position:"fixed",top:0,left:0,right:0,zIndex:200,background:"rgba(6,14,50,0.97)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,padding:"16px 18px"}}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>📝 有未完成的訓練</div>
            <div style={{fontSize:18,color:C.muted,marginBottom:14}}>
              {draftData.selType && `${typeInfo(draftData.selType)?.emoji} ${draftData.selType}｜`}{draftData.selExercise}
              <span style={{marginLeft:8,fontSize:16,color:C.muted}}>{draftData.savedAt?.slice(0,16).replace('T',' ')}</span>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={{...css.smBtn(C.accent),flex:1,padding:"12px"}} onClick={restoreDraft}>繼續上次訓練</button>
              <button style={{...css.smBtn(C.muted),flex:1,padding:"12px"}} onClick={discardDraft}>捨棄</button>
            </div>
          </div>
        )}
        <div style={css.header}>
          <div style={css.title}>💪 TinU Un-Tong</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {scriptUrl&&(
              <div style={{fontSize:18,color:syncStatus==='ok'?"#4ade80":syncStatus==='error'?"#f87171":syncStatus==='syncing'?"#eab308":C.muted,display:"flex",alignItems:"center",gap:4}}>
                <div style={{...css.syncDot(syncStatus||'idle'),background:syncStatus==='ok'?"#22c55e":syncStatus==='error'?"#ef4444":syncStatus==='syncing'?"#eab308":"#2a2a4a"}}/>
                {syncStatus==='syncing'?"同步中":syncStatus==='ok'?"已同步":syncStatus==='error'?"同步失敗":"☁️"}
              </div>
            )}
            <button style={{...css.navBtn}} onClick={()=>setShowSettings(true)}>⚙️</button>
          </div>
        </div>
        <div style={css.body}>
          <div style={{marginBottom:16}}>
            <div style={css.statCard("#818cf8")}>
              <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                <div style={css.statNum}>{visits}</div>
                <div style={css.statLabel}>本月進健身房次數</div>
              </div>
              {costPerVisit&&<div style={{fontSize:18,fontWeight:700,color:"#818cf8",marginTop:6}}>≈ NT${costPerVisit}<span style={{fontSize:18,fontWeight:400,color:C.muted}}> / 次</span></div>}
            </div>
          </div>
          <div style={css.monthNav}>
            <button style={css.navBtn} onClick={()=>setViewMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}>‹</button>
            <span style={css.monthLabel}>{viewMonth.getFullYear()} 年 {MONTHS[viewMonth.getMonth()]}</span>
            <button style={css.navBtn} onClick={()=>setViewMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}>›</button>
          </div>
          <div style={css.calGrid}>
            {WEEKDAYS_SHORT.map(d=><div key={d} style={css.dayHeader}>{d}</div>)}
            {days.map((day,i)=>{
              if(!day) return <div key={`e${i}`}/>;
              const ds=`${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const isToday=ds===today, isSel=ds===selectedDate, types=dayTypes(ds), isFuture=ds>today;
              return(
                <div key={ds} style={css.dayCell(isToday,isSel,types.length>0,isFuture)}
                  onClick={()=>{ if(!isFuture){ setSelectedDate(ds); setScreen("dayDetail"); } }}>                  <span style={css.dayNum(isToday)}>{day}</span>
                  {types.length>0&&<div style={css.dotRow}>{types.map(t=><div key={t} style={css.dot(typeInfo(t)?.color||"#888")}/>)}</div>}
                </div>
              );
            })}
          </div>
          <div style={{marginTop:16,textAlign:"center"}}>
            <div style={{...css.sectionLabel,textAlign:"center"}}>部位顏色對照</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>
              {TYPES.map(t=><div key={t.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:18,color:C.muted}}><div style={css.dot(t.color)}/>{t.emoji}{t.label}</div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 當日訓練 ──────────────────────────────────────────────
  if(screen==="dayDetail"){
    const today=todayStr(), isToday=selectedDate===today, sessions=log[selectedDate]||[];
    const d=new Date(selectedDate+"T00:00:00"), label=`${selectedDate} (${WEEKDAYS_FULL[d.getDay()]})`;
    return(
      <div style={css.app}>
        <div style={css.header}><div style={css.title}>{isToday?"今日訓練":"訓練紀錄"}</div></div>
        <div style={css.body}>
          <button style={css.backBtn} onClick={()=>setScreen("calendar")}>← 月曆</button>
          <div style={{fontSize:18,color:C.muted,marginBottom:16}}>{label}</div>
          {sessions.length>0&&(<>
            <div style={css.sectionLabel}>本日紀錄</div>
            {sessions.map((s,i)=>{
              const t=typeInfo(s.type);
              return(
                <div key={i} style={{...css.prevCard,marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span>{t?.emoji}</span>
                    <span style={{fontWeight:700,fontSize:18,flex:1}}>{t?.label}｜{s.exercise}</span>
                    {s.duration&&<span style={{fontSize:18,color:C.muted}}>{s.duration}分</span>}
                    <button style={{background:"none",border:"none",color:"#ef4444",fontSize:20,cursor:"pointer",padding:"0 4px",flexShrink:0}}
                      onClick={()=>setDeleteConfirm({date:selectedDate,idx:i})}>🗑</button>
                  </div>
                  {s.isCardio&&s.cardio
                    ?<div style={{fontSize:18,color:C.muted}}>坡度 {s.cardio.incline}% · 速度 {s.cardio.speed}kph · {s.cardio.duration}分鐘</div>
                    :(s.sets||[]).map((st,j)=><div key={j} style={{fontSize:18,color:C.muted,marginBottom:2}}>{s.isBodyweight?`第${j+1}組：${st.reps}次`:`第${j+1}組：${st.weight} ${st.unit||s.unit||"kg"} × ${st.reps}次`}</div>)
                  }
                </div>
              );
            })}

            {/* 刪除確認彈窗 */}
            {deleteConfirm&&(
              <div style={css.overlay}>
                <div style={css.modal}>
                  <div style={{fontSize:20,fontWeight:800,marginBottom:10}}>確定要刪除？</div>
                  <div style={{fontSize:18,color:C.muted,marginBottom:24}}>這筆訓練紀錄刪除後無法復原。</div>
                  <div style={{display:"flex",gap:10}}>
                    <button style={{...css.smBtn("#ef4444"),flex:1}} onClick={()=>deleteSession(deleteConfirm.date,deleteConfirm.idx)}>確定刪除</button>
                    <button style={{...css.smBtn(C.muted),flex:1}} onClick={()=>setDeleteConfirm(null)}>取消</button>
                  </div>
                </div>
              </div>
            )}
            <div style={css.divider}/>
          </>)}
          <button style={css.mainBtn(C.accent,false)} onClick={()=>{resetSession();setScreen("selectType");}}>
              ＋ {sessions.length>0?(isToday?"繼續新增訓練":"補登訓練"):(isToday?"開始記錄訓練":"補登這天的訓練")}
            </button>
          {sessions.length>0&&isToday&&(
            <button style={{...css.mainBtn("#22c55e",false), background:"linear-gradient(135deg,#14532d,#166534)", border:"2px solid #22c55e", marginTop:8}}
              onClick={()=>{ setShowPR(false); setScreen("calendar"); }}>
              🎉 完成今日訓練！
            </button>
          )}
          {sessions.length>0&&(
            <button style={{...css.mainBtn(copied?"#22c55e":C.muted,false),background:copied?"#0a2e16":C.card,color:copied?"#4ade80":C.muted,border:`1.5px solid ${copied?"#22c55e":C.border}`}}
              onClick={()=>copyDaySummary(selectedDate)}>
              {copied?"✅ 已複製！":"📋 複製當日訓練文字稿"}
            </button>
          )}
          {sessions.length===0&&selectedDate<todayStr()&&<div style={{textAlign:"center",color:C.muted,paddingTop:40,fontSize:18}}>該日無訓練紀錄</div>}
        </div>
      </div>
    );
  }

  // ── 選擇部位 ──────────────────────────────────────────────
  if(screen==="selectType") return(
    <div style={css.app}>
      <div style={css.header}><div style={css.title}>選擇訓練部位</div></div>
      <div style={css.body}>
        <button style={css.backBtn} onClick={()=>setScreen("dayDetail")}>← 返回</button>
        <div style={css.typeGrid}>
          {TYPES.map(t=>(
            <div key={t.id} style={css.typeCard(t,selType===t.id)} onClick={()=>{setSelType(t.id);setShowCustomInput(false);setScreen("selectExercise");}}>
              <span style={{fontSize:24}}>{t.emoji}</span>
              <div><div style={{fontWeight:700,fontSize:18}}>{t.label}</div><div style={{fontSize:18,color:C.muted,marginTop:2}}>{allExercises(t.id).length} 個動作</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── 選擇動作 ──────────────────────────────────────────────
  if(screen==="selectExercise") return(
    <div style={css.app}>
      <div style={css.header}><div style={css.title}>選擇動作</div></div>
      <div style={css.body}>
        <button style={css.backBtn} onClick={()=>setScreen("selectType")}>← 換部位</button>
        <div style={css.badge(ti)}>{ti?.emoji} {ti?.label}</div>
        {pendingCustom&&(
          <div style={css.overlay}>
            <div style={css.modal}>
              <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>新增「{pendingCustom}」</div>
              <div style={{fontSize:18,color:C.muted,marginBottom:20}}>要將此動作加入{ti?.label}的固定清單嗎？</div>
              <div style={{display:"flex",gap:10}}>
                <button style={{...css.smBtn(ti?.color),flex:1}} onClick={()=>{saveCustomExercise(pendingCustom,selType);selectExercise(pendingCustom);setPendingCustom(null);}}>加入固定清單</button>
                <button style={{...css.smBtn(C.muted),flex:1}} onClick={()=>{selectExercise(pendingCustom);setPendingCustom(null);}}>僅此次</button>
              </div>
            </div>
          </div>
        )}
        <div style={css.exList}>
          {allExercises(selType).map(ex=>{
            const last=getLastSession(ex);
            return(
              <div key={ex} style={css.exItem(selExercise===ex,ti?.color)} onClick={()=>selectExercise(ex)}>
                <div style={{fontWeight:500}}>{ex}</div>
                {last&&<div style={{fontSize:18,color:C.muted,marginTop:3}}>上次：{last.isCardio?`${last.cardio?.duration}分鐘`:(last.sets||[]).slice(0,3).map(s=>s.isBodyweight?`${s.reps}次`:`${s.weight}${s.unit}`).join(" / ")}</div>}
              </div>
            );
          })}
          {showCustomInput
            ?<div style={{display:"flex",gap:8,marginTop:4}}>
              <input style={{...css.input,flex:1,textAlign:"left"}} placeholder="輸入自訂動作名稱" value={customInput} onChange={e=>setCustomInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleCustomSubmit()} autoFocus/>
              <button style={css.smBtn(ti?.color)} onClick={handleCustomSubmit}>確認</button>
              <button style={css.smBtn(C.muted)} onClick={()=>setShowCustomInput(false)}>取消</button>
            </div>
            :<div style={{...css.exItem(false,ti?.color),textAlign:"center",color:ti?.color,fontWeight:700}} onClick={()=>setShowCustomInput(true)}>＋ 自訂動作</div>
          }
        </div>
      </div>
    </div>
  );

  // ── 記錄組數 ──────────────────────────────────────────────
  if(screen==="logSets"){
    const last=getLastSession(selExercise), isBW=isBodyweightExercise(selExercise);
    const reversedSets=[...sets].map((s,i)=>({...s,originalIdx:i})).reverse();
    return(
      <div style={css.app}>
        <div style={css.header}>
          <div style={css.title}>記錄組數</div>
          <button style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}} onClick={()=>setScreen("selectExercise")}>換動作</button>
        </div>
        <div style={css.body}>
          <div style={css.badge(ti)}>{ti?.emoji} {selExercise}</div>

          {/* 第一排：新增組數 + 完成動作 */}
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <button style={{flex:1,padding:"15px",borderRadius:12,border:`2px solid ${ti?.color||C.accent}`,background:"transparent",color:ti?.color||C.accent,fontSize:18,fontWeight:800,cursor:"pointer"}}
              onClick={addSet}>＋ 新增組數</button>
            <button style={{flex:1,padding:"15px",borderRadius:12,border:"none",background:ti?.color||C.accent,color:"#060c20",fontSize:18,fontWeight:800,cursor:"pointer"}}
              onClick={handleSave}>✓ 完成動作</button>
          </div>

          {/* 第二排：組間休息倒數 */}
          {restTimer&&restTimer.remaining>0&&(
            <div style={css.restBox}>
              <div style={{fontSize:36,fontWeight:900,color:C.accent,letterSpacing:"-1px"}}>{String(Math.floor(restTimer.remaining/60)).padStart(2,"0")}:{String(restTimer.remaining%60).padStart(2,"0")}</div>
              <div style={{fontSize:18,color:C.muted,marginTop:2}}>組間休息中</div>
              <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:10}}>
                {[60,90,120].map(s=><button key={s} style={css.smBtn(s===restPreset?C.accent:C.muted)} onClick={()=>{setRestPreset(s);setRestTimer({total:s,remaining:s});}}>{s}秒</button>)}
                <button style={css.smBtn("#ef4444")} onClick={()=>setRestTimer(null)}>跳過</button>
              </div>
            </div>
          )}

          {/* 上次訓練參考 */}
          {last&&(
            <div style={css.prevCard}>
              <div style={{fontSize:18,color:"#60a5fa",fontWeight:700,marginBottom:6}}>📋 上次訓練（{last.savedAt?.slice(0,10)}）</div>
              {(last.sets||[]).map((s,i)=><div key={i} style={{fontSize:18,color:C.muted,marginBottom:2}}>{isBW?`第${i+1}組：${s.reps}次`:`第${i+1}組：${s.weight} ${s.unit||last.unit||"kg"} × ${s.reps}次`}</div>)}
              <button style={{...css.smBtn("#60a5fa"),marginTop:8,fontSize:18}} onClick={()=>applyLastSession(last)}>套用上次作為起點</button>
            </div>
          )}

          {/* 第三排起：最新組在最上面（倒序） */}
          {reversedSets.map(({originalIdx:i,...set})=>(
            <div key={i} style={{marginBottom:10,padding:"14px",background:C.card,borderRadius:10,border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:18,fontWeight:700,color:ti?.color}}>第 {i+1} 組</span>
                {sets.length>1&&<button style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}} onClick={()=>setSets(p=>p.filter((_,j)=>j!==i))}>✕</button>}
              </div>
              {!isBW&&(
                <>
                  <div style={css.setRow}>
                    <span style={css.setLabel}>重量</span>
                    <input style={css.input} type="number" placeholder="0" value={set.weight}
                      onChange={e=>setSets(p=>p.map((s,j)=>j===i?{...s,weight:e.target.value}:s))}/>
                  </div>
                  {/* 單位選擇獨立一行，更清楚 */}
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    {["kg","lbs"].map(u=>(
                      <button key={u} style={{flex:1,padding:"10px",borderRadius:8,border:`2px solid ${(set.unit||unit)===u?ti?.color:C.border}`,background:(set.unit||unit)===u?ti?.color:"transparent",color:(set.unit||unit)===u?"#060c20":C.muted,fontSize:18,fontWeight:700,cursor:"pointer"}}
                        onClick={()=>setSets(p=>p.map((s,j)=>j===i?{...s,unit:u}:s))}>
                        {u.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div style={css.repsRow}>
                {REPS_PRESETS.map(r=>(
                  <button key={r} style={css.repBtn(String(set.reps)===String(r),ti?.color)}
                    onClick={()=>setSets(p=>p.map((s,j)=>j===i?{...s,reps:String(r)}:s))}>{r}</button>
                ))}
              </div>
              <input style={{...css.input,marginTop:6,width:"100%",flex:"none"}} type="number" placeholder="自訂次數" value={set.reps}
                onChange={e=>setSets(p=>p.map((s,j)=>j===i?{...s,reps:e.target.value}:s))}/>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── 有氧紀錄 ──────────────────────────────────────────────
  if(screen==="cardio") return(
    <div style={css.app}>
      <div style={css.header}><div style={css.title}>有氧紀錄</div></div>
      <div style={css.body}>
        <button style={css.backBtn} onClick={()=>setScreen("selectExercise")}>← 換動作</button>
        <div style={css.badge(ti)}>{ti?.emoji} {selExercise}</div>
        {[{label:"坡度",field:"incline",u:"%"},{label:"速度",field:"speed",u:"kph"},{label:"時間",field:"duration",u:"分鐘"}].map(({label,field,u})=>(
          <div key={field} style={css.setRow}>
            <span style={css.setLabel}>{label}</span>
            <input style={css.input} type="number" placeholder="0" value={cardioData[field]} onChange={e=>setCardioData(p=>({...p,[field]:e.target.value}))}/>
            <span style={{fontSize:18,color:C.muted,width:40,textAlign:"center"}}>{u}</span>
          </div>
        ))}
        <div style={css.divider}/>
        <button style={css.mainBtn(ti?.color||C.accent,false)} onClick={handleSave}>💾 完成並儲存</button>
      </div>
    </div>
  );

  return null;
}
