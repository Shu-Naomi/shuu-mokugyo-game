'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const registration=html.match(/      if \([^\n]*"serviceWorker" in navigator\)\n        navigator\.serviceWorker\.register\("\.\/sw\.js\?v=[0-9-]+"\)\.catch\(\(\) => \{\}\);/g);

function register(search,supported=true){
 assert.equal(registration?.length,1,'one service-worker registration guard');
 const calls=[],navigator=supported?{serviceWorker:{register:url=>{calls.push(url);return Promise.resolve();}}}:{};
 vm.runInNewContext(registration[0],{URLSearchParams,location:{search},navigator});
 return calls;
}

test('integrated normal mode retains the live v252-59 service worker',()=>{
 for(const search of ['', '?villageReference=0','?villageReference=false'])assert.deepEqual(register(search),['./sw.js?v=252-59']);
 assert.deepEqual(register('',false),[],'unsupported browser does not try to register');
});
test('reference mode still never registers the production service worker',()=>{
 for(const search of ['?villageReference=1','?v=252-59&villageReference=1'])assert.deepEqual(register(search),[]);
 assert.deepEqual(register('?villageReference=1',false),[]);
});
