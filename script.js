const
  c = console.log,  ls = localStorage,
  { parse, stringify } = JSON,  { assign } = Object,  { max } = Math,
  getId = obj => obj.id

Event.prototype.pd = Event.prototype.preventDefault

assign(HTMLElement.prototype, {
  next: function () { return this.nextElementSibling },
  prev: function () { return this.previousElementSibling },
  in: function (str='') { this.innerHTML = str; return this },
  val: function (str='') { this.value = str; return this },
  parent: function (sel) { return sel? this.closest(sel) : this.parentNode },
  all: function (sel) {
         return [...sel? this.querySelectorAll(sel) : this.children] },
  last: function (sel) {
          return sel? this.all(sel).pop() : this.lastElementChild },
  first: function (sel) {
           return sel? this.querySelector(sel) : this.firstElementChild },
  child: function (sel) { return typeof sel!='number'? this.first(sel) :
           this.children[sel<0? this.all().length+sel : sel] },
  sibs: function (i) { return typeof i!='number'? this.parent().all() :
          this.parent().child(i) },
  i: function () { return this.sibs().indexOf(this) },
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

  date2day =(date=new Date)=> +((date.getYear()%100+'').padEnd(2,0)+
    (date.getMonth()+1+'').padEnd(2,0)+(date.getDate()+'').padEnd(2,0)),

  day2date = day => (day='20'+day, new Date(day.slice(0,4)+'-'+
    day.slice(4,6)+'-'+day.slice(6))),

  Task = function (name, done, day=date2day()) {
    assign(this, {id: ++state.id, name, done: +done, day})
  },

  addTask = e => {
    if (e && e.key!='Enter') return
    const name = input.value.trim(),  done = e && e.ctrlKey
    memoNot()
    if (name) updState(s => (s.tasks.push(new Task(name, done)),
      input.val(s.input = ''), 1))
  },

  clickAddTask = e => {
    if (!['DIV', 'UL', 'LI', 'BODY'].includes(e.target.tagName)) return
    updState(s => (s.filter='', s.tasks.push(new Task('', state.done=='yes'))))
    tasks.last(`[id="${state.id}"]>span`).focus()
  },

  delTask = el => {
    if (tasks.all().length>1) {
      const heir = (el.parent().next() || el.parent().prev()).id
      setTimeout(()=> tasks.child(`[id="${heir}"]`).last().focus(), 0)
    }
    updState(s => s.tasks = s.tasks.filter(task => task.id!=el.parent().id))
  },

  markTask = el => {
    const done = el.parent().classList.contains('done'),
          id = el.parent().id
    updState(()=> (getTask(id).done = +!done, 1))
    setTimeout(()=> {
      const el = tasks.first(`[id="${id}"]`)
      if (el) el.first().focus()
    }, 0)
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
    if (e.key[5]=='L' && !getSelection().getRangeAt(0).endOffset)
      el.prev().focus()
    else if (e.key[5]=='R' && getSelection().getRangeAt(0).endOffset == el.innerText.length) el.next().focus()
    // else if (e.key=='Escape') el.blur()
    else if (e.key=='Enter') {
      if (e.ctrlKey) updState(s => (s.filter = '',
        s.tasks.push(new Task(el.innerText.trim(), state.done=='yes')))),
        tasks.last(`[id="${state.id}"]>span`).focus()
      else delete el.prevText, el.blur()
    }
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
    const el = e.target
    if (e.key=='Enter' && el==body) setTimeout(clickAddTask,0, e)
    else if (e.key=='Escape') el.blur()
    else if ('sыі'.includes(e.key) && e.ctrlKey) e.pd(), saveState()
    else if ('lд'.includes(e.key) && e.ctrlKey) e.pd(), stateLoader.click()
    else if (e.key.includes('Arrow') && (el==body || (el.parent('#tasks') &&
      (el.id!='task' || !e.key.endsWith('t'))))) e.pd(), arrowMove(e)
  },

  saveState =()=> {
    const href='data:text/plain;charset=utf-8,'+encodeURI(stringify(state,0,2)),
          download = String(new Date).match(/^\w+ (.+(:\d+){2})/)[1]
            .replace(/:/g,'-')+'.json'
    assign(stateSaver, {href, download}).click()
  },

  loadState =()=> {
    assign(new FileReader(), {onload: e => updState(()=> {
      const loaded = parse(e.target.result), v = max(loaded.v, state.v)
      return state = assign(loaded, {v})
    })}).readAsText(stateLoader.files[0])
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
  },

  arrowMove = e => {
    if (e.target==body) tasks.child((taskList.scrollTop+taskList.clientHeight/2)
      * tasks.all().length / tasks.clientHeight |0).first().focus()
    const el = document.activeElement
    if (e.key[5]=='U') (el.parent().prev() || el.parent()).child(el.i()).focus()
    else if (e.key[5]=='L') (el.prev() || el).focus()
    else if (e.key[5]=='R') (el.next() || el).focus()
    else (el.parent().next() || el.parent()).child(el.i()).focus()
  }


let state = { v: 0, input: '', sort: 'byId', dir: 'desc',
              hidden: ["views", "sorts", "filters"], done:'all',
              filter:'', tasks: [], id: 0 }

syncStore(), syncView()