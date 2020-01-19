HTMLElement.prototype.clear = function () {
  if (this.value) this.value = ''
  if (this.innerHTML) this.innerHTML = ''
}

const
  c = console.log,  ls = localStorage,
  { parse, stringify } = JSON

const

  SYNC_LS_INTER = 2000,
  SYNC_VIEW_INTER = 333,
  MEMO_THROTTLE = 500,

  makeRepeatable =(fn, inter)=> {
    const start =()=> {
      stop(), fn()
      start.intId = setInterval(fn, inter)
    }
    const stop =()=> clearInterval(start.intId)
    return [start, stop]
  },

  makeThrottled =(fn, delay)=> {
    const throttled =(...args)=> {
      clearTimeout(cancel.timer)
      cancel.timer = setTimeout(fn, delay, ...args)
    }
    const immediate =(...args)=> {
      clearTimeout(cancel.timer), fn(...args)
    }
    const cancel =()=> clearTimeout(cancel.timer)
    return [throttled, cancel, immediate]
  },

  syncStoreOnce =()=> {
    const lsvIs = lsv()
    if (lsvIs==state.v) return
    if (lsvIs<=state.v) ls.state = stringify(state)
    else state = parse(ls.state)
  },

  [ syncStore, stopSyncStore ] = makeRepeatable(syncStoreOnce, SYNC_LS_INTER),

  syncViewOnce =()=> {
    if (view.v==state.v) return
    input.value = state.input
    tasks.clear()
    tasks.append(...state.tasks.map(buildTaskEl))
    view.v = state.v
  },

  [ syncView, stopSyncView ] = makeRepeatable(syncViewOnce, SYNC_VIEW_INTER),

  updState = queryFn => {
    syncStoreOnce()
    if (queryFn()) ++state.v
    syncView()
    syncStore()
  },

  lsv =()=> ls.state? +ls.state.match(/"v":(\d+)/)[1] : 0,

  buildTaskEl =({id, name, done})=> {
    task.innerText = name
    const clone = template.cloneNode(2)
    clone.id = id
    if (done) clone.classList.add('done')
    return clone
  },

  getTask = id => state.tasks.find(task => task.id==id),

  addTask = e => {
    if (e && e.key!='Enter') return
    const name = input.value.trim()
    memoNot()
    if (!name) return
    updState(()=> {
      state.tasks.push({id: ++state.id, name})
      state.input = input.value = ''
      return 1
    } )
  },

  delTask = el => {
    const id = el.parentNode.id
    updState(()=> state.tasks = state.tasks.filter(task => task.id!=id))
  },

  markTask = el => {
    const id = el.parentNode.id,
          done = el.parentNode.classList.contains('done')
    updState(()=> (getTask(id).done = !done, 1))
  },

  updTask = el => {
    if (el.prevText) el.innerText = el.prevText
    const id = el.parentNode.id,  name = el.innerText
    if (name!=getTask(id).name)
      updState(()=> (getTask(id).name = name, 1))
  },

  blurTask = e => {
    const el = e.target
    if (e.key=='Escape') el.blur()
    else if (e.key=='Enter') delete el.prevText, el.blur()
  },

  memText = el => el.prevText = el.innerText,

  memoVal = (el, val) => updState(()=>
    (state[el.id] = val!=undefined? val : el.value, 1)),

  [ memo, memoNot, memoNow ] = makeThrottled(memoVal, MEMO_THROTTLE)


let state = { v: 0, input: '', tasks: [], id: 0 }

syncStore(), syncView()
