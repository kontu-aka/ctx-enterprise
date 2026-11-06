// A tab-local, allowlisted checkpoint. No copy text, real company data, localStorage or network.
(function(root){
 'use strict';
 function create({edition,ids,choices,pageCount,
 }){
  const key='ctx-r6-tab-v1:'+edition;let storage,available=true;
  try{storage=root.sessionStorage;const test=key+':probe';storage.setItem(test,'1');storage.removeItem(test);}catch{available=false;}
  const clean=state=>{
   const answers={};for(const id of ids)if(Object.hasOwn(state.answers||{},id)&&choices.includes(state.answers[id]))answers[id]=state.answers[id];
   const data={version:1,edition,answers,max:Number.isInteger(state.max)?Math.max(0,Math.min(pageCount-1,state.max)):0};
   return data;
  };
  function load(){if(!available)return null;try{const raw=storage.getItem(key);if(!raw)return null;if(raw.length>4096)throw Error('Too large');
   const data=JSON.parse(raw);if(data.version!==1||data.edition!==edition||!data.answers||Array.isArray(data.answers))throw Error('Invalid checkpoint');
   return clean(data);}catch{try{storage.removeItem(key);}catch{}return null;}}
  function save(state){if(!available)return false;try{
   const data=clean(state);let empty=!Object.keys(data.answers).length;
   if(empty)storage.removeItem(key);else storage.setItem(key,JSON.stringify(data));return true;
  }catch{available=false;return false;}}
  function clear(){try{storage?.removeItem(key);}catch{available=false;}}
  return {load,save,clear,get available(){return available},key};
 }
 root.CTX_RUN_SESSION={create};
 if(typeof module!=='undefined')module.exports=root.CTX_RUN_SESSION;
})(globalThis);