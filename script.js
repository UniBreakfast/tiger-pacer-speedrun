const
  c = console.log,  ls = localStorage,
  { parse, stringify } = JSON,
  { assign } = Object,
  getId = obj => obj.id

assign(HTMLElement.prototype, {
  parent: function (sel) { return sel? this.closest(sel) : this.parentNode },
  all: function (sel='*') { return [...this.querySelectorAll(sel)] },
  in: function (str='') { this.innerHTML = str; return this },
  val: function (str='') { this.value = str; return this },
  first: function (sel) { return this.querySelector(sel) },
  last: function (sel='*') { return this.all(sel).pop() },
  child: function (sel) { return this.first(sel) },
})

// assign(Array.prototype, {
//   unique: function () { return [...new Set(this)]}
// })

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
    input.val(state.input)
    setTimeout(()=> {
      eye.classList[state.hidden[2]? 'remove':'add']('striked')
      tiger.className = state.dir
    }, 300)
    viewBars.map(bar => (state.hidden.includes(bar.id)? hide:show)(bar))
    sort.in(sortSel.child('#'+state.sort).innerText)
    filterInp.val(state.filter)
    ifDone.className = state.done
    const condFn = state.done=='all'? Boolean :
            task => task.done==(state.done=='yes'),
          prop = state.sort.slice(2).toLowerCase(),
          desc = state.dir? -1 : 1,
          sortFn =(a, b)=> a[prop]<b[prop]? 1*desc : -1*desc,
          shown = state.tasks.filter(condFn).filter(state.filter?
            task => task.name.toLowerCase().includes(state.filter) : Boolean)
    tasks.in().append(...shown.sort(sortFn).map(buildTaskEl))
    updStatusBar(shown)
    view.v = state.v
  },

  [ syncView, stopSyncView ] = makeRepeatable(syncViewOnce, SYNC_VIEW_INTER),

  updState = queryFn => {
    syncStoreOnce()
    if (queryFn(state)) ++state.v
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
    const name = input.value.trim(),  done = e && e.ctrlKey
    memoNot()
    if (name) updState(s => {
      s.tasks.push({id: ++s.id, name, done})
      input.val(s.input = '')
      return 1
    } )
  },

  clickAddTask = e => {
    if (['DIV', 'UL', 'LI'].includes(e.target.tagName))
      updState(s=> s.tasks.push({id:++s.id, name:'', done: state.done=='yes'})),
      tasks.last('span').focus()
  },

  delTask = el =>
    updState(s => s.tasks = s.tasks.filter(task => task.id!=el.parent().id)),

  markTask = el => {
    const done = el.parent().classList.contains('done')
    updState(()=> (getTask(el.parent().id).done = !done, 1))
  },

  updTask = el => {
    if (el.prevText) el.innerText = el.prevText
    const id = el.parent().id,  name = el.innerText.trim()
    if (!name) delTask(el)
    else if (name!=getTask(id).name)
      updState(()=> (getTask(id).name = name, 1))
  },

  blurTask = e => {
    const el = e.target
    if (e.key=='Escape') el.blur()
    else if (e.key=='Enter') delete el.prevText, el.blur()
  },

  memoText = el => el.prevText = el.innerText,

  memoVal = (el, val) => updState(()=>
    (state[el.id] = val!=undefined? val : el.value, 1)),

  [ memo, memoNot, memoNow ] = makeThrottled(memoVal, MEMO_THROTTLE),

  viewBars = [views, sorts, filters],
  show = el => el.classList.remove('hidden'),
  hide = el => el.classList.add('hidden'),
  hideBar = el => updState(s => s.hidden.push(el.id)),
  toggleView =()=>
    updState(s => s.hidden = s.hidden[2]? [] : viewBars.map(getId)),

  filterDone =()=> updState(s =>
    s.done = s.done=='all'? 'not' : s.done=='not'? 'yes' : 'all'),

  globalHK = e => {
    if ('sыі'.includes(e.key) && e.ctrlKey) e.preventDefault(), saveState()
    if ('lд'.includes(e.key) && e.ctrlKey)
      e.preventDefault(), stateLoader.click()
  },

  saveState =()=> {
    const href='data:text/plain;charset=utf-8,'+encodeURI(stringify(state,0,2)),
          download = String(new Date).match(/^\w+ (.+(:\d+){2})/)[1]
            .replace(/:/g,'-')+'.json'
    assign(stateSaver, {href, download}).click()
  },

  loadState =()=> {
    assign(new FileReader(), {onload: e => updState(()=>
      state = assign(parse(e.target.result), {v: state.v}))})
        .readAsText(stateLoader.files[0])
    stateLoader.val()
  },

  toggleSortSel = el =>
    [sortSel, el.last()].map(el => el.classList.toggle('hidden')),

  selSort = el => updState(s => s.sort = el.id, sort.parent().click()),

  changeDir =()=> {
    tiger.classList.toggle('desc')
    updState(s => (s.dir = s.dir? '':'desc', 1))
  },

  partFilter = el => setTimeout(updState, 0,
    s => (s.filter = el.value.toLowerCase(), 1)),

  ending1 = n => n>5&&n<21? '' : n%10==1? 'а' : n%10>1&&n%10<5? 'и' : '',
  ending2 = n => n%10==1&&n!=11? 'и' : '',
  ending3 = n => n%10==1&&n!=11? 'е' : 'ю',
  ending4 = n => n>5&&n<21? 'ых' : n%10==1? 'ая' : n%10>1&&n%10<5? 'ые' : 'ых',

  updStatusBar = tasks => {
    const total = state.tasks.length,  shown = tasks.length,
          done = tasks.filter(task => task.done).length,
          filtered = total - shown,  planned = shown - done
    let line
    if (!total) line = 'нет задач - самое время что-то запланировать!'
    else {
      if (!shown) line = 'нет задач, прошедших фильтры'
      else if (!done) line = planned+` задач${ending1(planned)} ожида${
        ending3(planned)}т выполнения`
      else if (planned) line = planned+` из ${shown} задач${ending2(shown)
        } ожидают выполнения`
      else line = done+` выполненн${ending4(done)} задач`+ending1(done)
      if (filtered) line += ` (${filtered} отфильтровано)`
      else if (!planned) line += ', добавьте новые!'
    }
    statusBar.in(line)
  }


let state = { v: 0, input: '', sort: 'byId', dir: 'desc', hidden: [], done:'all', filter:'', tasks: [], id: 0 }

syncStore(), syncView()