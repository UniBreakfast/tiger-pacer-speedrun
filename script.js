const
  c = console.log,  ls = localStorage,
  { parse, stringify } = JSON,  { assign } = Object,  { min, max } = Math,
  getId = obj => obj.id,
  crEl = tag => document.createElement(tag)

Event.prototype.pd = Event.prototype.preventDefault

assign(HTMLElement.prototype, {
  in: function (str='') { this.innerHTML = str; return this },
  val: function (str='') { this.value = str; return this },
  parent: function (sel) { return sel? this.closest(sel) : this.parentNode },
  next: function (sel) { return sel? this.sibs(sel)[this.i(sel)+1] :
          this.nextElementSibling },
  prev: function (sel) { return sel? this.sibs(sel)[this.i(sel)-1] :
          this.previousElementSibling },
  all: function (sel) {
         return [...sel? this.querySelectorAll(sel) : this.children] },
  last: function (sel) {
          return sel? this.all(sel).pop() : this.lastElementChild },
  first: function (sel) {
           return sel? this.querySelector(sel) : this.firstElementChild },
  child: function (sel) { return typeof sel!='number'? this.first(sel) :
           this.children[sel<0? this.all().length+sel : sel] },
  sibs: function (sel) { return typeof sel!='number'? this.parent().all(sel) :
          this.parent().child(i) },
  i: function (sel) { return this.sibs(sel).indexOf(this) },
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
    if (state.q && view.v+1==state.v) return quickSync()
    input.val(state.input)
    setTimeout(()=> {
      eye.classList[state.hidden[2]? 'remove':'add']('striked')
      tiger1.className = state.dir1,  tiger2.className = state.dir2
    }, 300)
    viewBars.map(bar => (state.hidden.includes(bar.id)? hide:show)(bar))
    sort1.in(sortSel1.child('#'+state.sort1+1).innerText)
    sort2.in(sortSel2.child('#'+state.sort2+2).innerText)
    filterInp.val(state.filter)
    ifDone.className = state.done
    ![dates, days].map(el => el.id==state.only? show(el) : hide(el))
    daysBefore.val(state.days[0]), daysAfter.val(state.days[1])
    since.val(state.dates[0]||'начала'), till.val(state.dates[1]||'конца')
    const
      [ minDate, maxDate ] = minMaxDate(),
      condFn = state.done=='all'? Boolean :
        task => task.done==(state.done=='yes'),
      earliest = state.only=='days'? state.days[0]=='все'? 0 :
        date2day(new Date(shift(date2iso(), -state.days[0]))) :
          state.dates[0]=='начала'? 0 : date2day(new Date(state.dates[0])),
      latest = state.only=='days'? state.days[1]=='все'? 0 :
        date2day(new Date(shift(date2iso(), state.days[1]))) :
          state.dates[1]=='конца'? 0 : date2day(new Date(state.dates[1])),
      dayFn1 = earliest? task => task.day>=earliest : Boolean,
      dayFn2 = latest? task => task.day<=latest : Boolean,
      prop1 = state.sort1.slice(2).toLowerCase(),
      prop2 = state.sort2.slice(2).toLowerCase(),
      desc1 = state.dir1? -1 : 1,  desc2 = state.dir2? -1 : 1,
      sortFn1 =(a, b)=> a[prop1]<b[prop1]? 1*desc1 : -1*desc1,
      sortFn2 =(a, b)=> a[prop2]<b[prop2]? 1*desc2 : -1*desc2,
      shown = state.tasks.filter(condFn).filter(state.filter?
        task => task.name.toLowerCase().includes(state.filter) : Boolean)
        .filter(dayFn1).filter(dayFn2)
    tasks.in().append(...shown.sort(sortFn1).sort(sortFn2).map(buildTaskEl))
    if (state.sort2=='byDay') tasks.all().map((li, i, lis)=> {
      if (i && li.day!=lis[i-1].day) {
        const hr = crEl('hr')
        hr.dataset.day = (li.day==date2day()? 'сегодня \xa0':'') +
          String(li.day).replace(/..(..)(..)/,'$2.$1')
        tasks.insertBefore(assign(hr), li)
      }
    })
    ![since, till].map(el => [el.min, el.max] = [minDate, maxDate])
    state.only=='days'? updDaysBar()||updDaysTotal() :
      updDatesBar()||updDatesTotal()
    if (state.only=='days') updDaysBar(), updDaysTotal()
    else updDatesBar(), updDatesTotal(minDate, maxDate)
    updStatusBar(shown)
    view.v = state.v
  },

  [ syncView, stopSyncView ] = makeRepeatable(syncViewOnce, SYNC_VIEW_INTER),

  quickSync =()=> {
    if (state.q.input) input.val(state.q.input)
    else if (state.q.done!=undefined)
      tasks.child(`[id="${state.q.id}"]`).className = state.q.done? 'done':''
    else if (state.q.name)
      tasks.child(`[id="${state.q.id}"]>span`).in(state.q.name)
    else {
      const li = tasks.child(`[id="${state.q.id}"]`)
      if (li.i() && li.prev().id==li.next().id) li.prev().remove()
      li.remove()
    }
    view.v = state.v
  },

  updState =(queryFn, quick)=> {
    syncStoreOnce()
    if (queryFn(state)) state.q = quick||0, ++state.v
    syncView()
    syncStore()
  },

  lsv =()=> ls.state? +ls.state.match(/"v":(\d+)/)[1] : 0,

  buildTaskEl =({id, name, done, day})=> {
    task.innerText = name
    const clone = template.cloneNode(2)
    clone.id = id,  clone.day = day
    if (done) clone.classList.add('done')
    return clone
  },

  getTask = id => state.tasks.find(task => task.id==id),

  date2day =(date=new Date)=> +((date.getYear()%100+'').padStart(2,0)+
    (date.getMonth()+1+'').padStart(2,0)+(date.getDate()+'').padStart(2,0)),

  iso2day = date => date2day(new Date(date)),

  day2date = day => new Date(day2iso(day)),

  day2iso = day => (day='20'+day,
    day.slice(0,4)+'-'+day.slice(4,6)+'-'+day.slice(6)),

  date2iso =(date=new Date)=> date.getFullYear()+'-'+
    (date.getMonth()+1+'').padStart(2,0)+'-'+(date.getDate()+'').padStart(2,0),

  dotDateFix = str => str.replace(/^(\d{1,2})\.(\d{1,2})/, '$2.$1.')
    .replace(/^(\d{1,2})$/, `${new Date().getMonth()+1}.$1.`)
    .replace(/\.$/, '.'+new Date().getFullYear()).replace('..', '.'),

  minMaxDate =()=> {
    const days = state.tasks.map(task => task.day)
    return [day2iso(min(...days)),
            day2iso(max(...days, date2day(new Date(shift(date2iso(), 7)))))]
  },

  shift =(date, days=1)=> typeof date=='string'?
    date2iso(shift(new Date(date), days)) : typeof date=='number'?
    date2day(shift(day2date(date), days)) : new Date(+date + 864e5*days),

  prevDate =(el, e)=> {
    updState(s => {
      if (el==since) {
        if (s.dates[0]==el.min) return s.dates[0]='начала'
        else if (s.dates[0]=='начала') return s.dates[0]=el.min
      } else if (el==till && s.dates[1]=='конца') return s.dates[1]=el.max
      const prev = shift(el.value, e.shiftKey? -30 : -1)
      s.dates[+(el==till)] = prev<el.min? el.min : prev
      if (s.dates[0]!='начала' && s.dates[0]>s.dates[1] &&
        s.dates[0]!=since.min)  s.dates[0] = s.dates[1]
      return 1
    })
  },
  nextDate =(el, e)=> {
    updState(s => {
      if (el==since && s.dates[0]=='начала') return s.dates[0]=el.min
      if (el==till && s.dates[1]==el.max) return s.dates[1]='конца'
      const next = shift(el.value, e.shiftKey? 30 : 1)
      s.dates[+(el==till)] = next>el.max? el.max : next
      if (s.dates[0]!='начала' && s.dates[0]>s.dates[1] && s.dates[1]!=till.max)
        s.dates[1] = s.dates[0]
      return 1
    })
  },
  jumpDate = el => {
    updState(s => {
      if (el!=till) {
        if (s.dates[0]=='начала') {
          s.dates[0]=date2iso()
          if (s.dates[1]<s.dates[0]) s.dates[1]=s.dates[0]
        } else if (s.dates[0]==date2iso() && s.dates[0]!=s.dates[1])
          s.dates[0] = s.dates[1]=='конца'? el.max : s.dates[1]
        else s.dates[0] = 'начала'
      } else {
        if (s.dates[1]=='конца') {
          s.dates[1]=date2iso()
          if (s.dates[1]<s.dates[0] && s.dates[0]!='начала')
            s.dates[0] = s.dates[1]
        } else if (s.dates[1]==date2iso() && s.dates[0]!=s.dates[1])
          s.dates[1] = s.dates[0]=='начала'? el.min : s.dates[0]
        else s.dates[1] = 'конца'
      }
      return 1
    })
  },
  typedDate = el => {
    if (el!=till) {
      if (el.value==state.dates[0]) return
      if ('начала'.startsWith(el.value) || el.value.startsWith('начала'))
        updState(s => s.dates[0] = 'начала')
      else {
        const date = new Date(dotDateFix(el.value))
        if (!+date) el.value = state.dates[0]
        else updState(s => (s.dates[0] = date2iso(date),
          s.dates[1] = s.dates[+(s.dates[1]>s.dates[0])]))
      }
    } else {
      if (el.value==state.dates[1]) return
      if ('конца'.startsWith(el.value) || el.value.startsWith('конца'))
        updState(s => s.dates[1] = 'конца')
      else {
        const date = new Date(dotDateFix(el.value))
        if (!+date) el.value = state.dates[1]
        else updState(s => (s.dates[1] = date2iso(date), s.dates[0] =
          s.dates[+(s.dates[1]<s.dates[0] && s.dates[0]!='начала')]))
      }
    }
  },
  lessDays =(el, e)=> {
    updState(s => {
      const i = [daysBefore, daysAfter].indexOf(el),  n = s.days[i]
      s.days[i] = n=='все'? 99 : n>0? n-(e.shiftKey&&n>9? 10 : 1) : 0
      return 1
    })
  },
  moreDays =(el, e)=> {
    updState(s => {
      const i = [daysBefore, daysAfter].indexOf(el),  n = s.days[i]
      s.days[i] = n=='все'? 100 : n<999? n+(e.shiftKey&&n<989? 10 : 1) : 999
      return 1
    })
  },
  jumpDays = el => {
    updState(s => {
      const i = [daysBefore, daysAfter].indexOf(el),  n = s.days[i]
      s.days[i] = n=='все'? 0 : n==0? 3 : n==3? 7 : n==7? 14 : n==14? 31 : n==31? 365 : 'все'
      return 1
    })
  },
  typedDay = el => {
    const i = [daysBefore, daysAfter].indexOf(el),  v = el.value
    if (v==state.days[i]) return
    if (v && ('все'.startsWith(v) || v.startsWith('все')))
      updState(s => s.days[i] = 'все')
    else {
      if (+v||v==0) updState(s => (s.days[i] = +v<1? 0 : +v>999? 999 : +v|0, 1))
      else el.value = state.days[i]
    }
  },

  Task = function (name, done, day=date2day()) {
    assign(this, {id: ++state.id, name, done: +done, day})
  },

  addTask = e => {
    if (e && e.key!='Enter') return
    const name = input.value.trim(),
          day = e.shiftKey? shift(date2day()) : date2day()
    memoNot()
    if (name) updState(s => (s.tasks.push(new Task(name, e.ctrlKey, day)),
      input.val(s.input = ''), 1))
  },

  clickAddTask = e => {
    const el = e.target,  tag = el.tagName
    if (!['DIV', 'UL', 'LI', 'HR', 'BODY'].includes(tag)) return
    const day = state.sort2=='byDay'? tag=='LI'? el.day : tag=='HR'? el.next().day :0 :0
    updState(s => (s.filter='',
      s.tasks.push(new Task('', state.done=='yes', day||undefined))))
    tasks.last(`[id="${state.id}"]>span`).focus()
  },

  delTask = el => {
    if (tasks.all().length>1 && el.innerText) {
      const heir = (el.parent().next() || el.parent().prev()).id
      setTimeout(()=> tasks.child(`[id="${heir}"]`).last().focus(), 0)
    }
    const id = el.parent().id
    updState(s => s.tasks = s.tasks.filter(task => task.id!=id), {id})
  },

  markTask = el => {
    const done = +!el.parent().classList.contains('done'),
          id = el.parent().id
    updState(()=> (getTask(id).done = done, 1), {id, done})
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
      updState(()=> (getTask(id).name = name, 1), {id, name})
  },

  blurTask = e => {
    const el = e.target
    if (e.key[5]=='L' && !getSelection().getRangeAt(0).endOffset)
      el.prev().focus()
    else if (e.key[5]=='R' && getSelection().getRangeAt(0).endOffset == el.innerText.length) el.next().focus()
    else if (e.key=='Enter') {
      if (e.ctrlKey) updState(s => (s.filter = '', s.tasks.push(
        new Task(el.innerText.trim(), state.done=='yes', shift(date2day()))))),
        tasks.last(`[id="${state.id}"]>span`).focus()
      else delete el.prevText, el.blur()
    }
  },

  memoText = el => el.prevText = el.innerText,

  memoVal = (el, val=el.value) => updState(s => (s[el.id] = val, 1),
    {[el.id]: val}),

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

  toggleModal =(el, e)=> {
    [el.next(), el.last()].map(el => el.classList.toggle('hidden'))
    if (e.target==el.last()) el.blur()
  },

  selSort = el => updState(s => s['sort'+el.id.slice(-1)] = el.id.slice(0,-1),
    el.parent().prev().click()),

  changeDir = el => {
    el.classList.toggle('desc')
    const i = el.id.slice(-1)
    updState(s => (s['dir'+i] = s['dir'+i]? '':'desc', 1))
  },

  partFilter = el => setTimeout(updState, 0,
    s => (s.filter = el.value.toLowerCase(), 1)),

  end1 = n => n>5&&n<21? '' : n%10==1? 'а' : n%10>1&&n%10<5? 'и' : '',
  end2 = n => n%10==1&&n!=11? 'и' : '',
  end3 = n => n%10==1&&n!=11? 'е' : 'ю',
  end4 = n => n>5&&n<21? 'ых' : n%10==1? 'ая' : n%10>1&&n%10<5? 'ые' : 'ых',
  end5 = n => n>5&&n<21? 'ней' : n%10==1? 'ень' : n%10>1&&n%10<5? 'ня' : 'ней',
  end6 = n => n>5&&n<21? 'ь' : n%10==1? 'я' : n%10>1&&n%10<5? 'и' : 'ь',

  updStatusBar = tasks => {
    const total = state.tasks.length,  shown = tasks.length,
          done = tasks.filter(task => task.done).length,
          filtered = total - shown,  planned = shown - done
    let line
    if (!total) line = 'нет задач - самое время что-то запланировать!'
    else {
      if (!shown) line = 'нет задач, прошедших фильтры'
      else if (!done) line = planned+` задач${end1(planned)} ожида${
        end3(planned)}т выполнения`
      else if (planned) line = planned+` из ${shown} задач${end2(shown)
        } ожидают выполнения`
      else line = done+` выполненн${end4(done)} задач`+end1(done)
      if (filtered) line += ` (${filtered} отфильтровано)`
      else if (!planned) line += ', добавьте новые!'
    }
    statusBar.in(line)
  },

  updDaysBar =()=> {
    const [a, b] = state.days
    daysAre.in(a=='все'? `все ${b=='все'? '' : b==0? 'по сей день' : b==1?
      'по завтрашний день' : `прошлые и ${b} вперёд`}` :
      a==0? `сегодня ${b=='все'? 'и все будущие' : b==0? '' : b==1?
      'и завтра' : `и ${b} вперёд`}` : a==1? `${b>1&&b<'в'? 'со ':''}вчера${
      b=='все'? ' и все будущие' : b==0? ' и сегодня' : b==1?
      ', сегодня, завтра' : ` и ${b} вперёд`}` : `прошлые ${a} и ${b=='все'?
      'будущие' : b==0? 'сегодня' : b==1? 'до завтра' : `${b} вперёд`}`)
  },
  updDaysTotal =()=> {
    const [a, b] = state.days
    daysTotal.dataset.count = a=='все'&&b=='все'? 'без фильтрации' : a=='все'?
      `${b+1}+ дней${b>5? ` (${(b+2)/7|0}+ недель)`:''}` : b=='все'?
      `${a+1}+ дней${a>5? ` (${(a+2)/7|0}+ недель)`:''}` : `${a+1+b} д${
      end5(a+1+b)}${a+1+b>6? ` (${(a+1+b)/7|0}${(a+1+b)%7? '+ недель':` недел${
      end6((a+1+b)/7|0)}` })`:''}`
  },
  updDatesBar =()=> {
    const [a, b] = state.dates, cY = new Date().getFullYear(),
          [aY,aM,aD] = a.match(/\d+/g)||[],  [bY,bM,bD] = b.match(/\d+/g)||[],
          [aDMY, aDM, aMY, bDMY, bDM] = [[aD,aM,aY], [aD,aM], [aM,aY],
            [bD,bM,bY], [bD,bM]].map(group => group.join('.'))
    datesAre.in(a=='начала'? b=='конца'? 'все' : 'все до '+bDMY : b=='конца'?
      'все c '+aDMY : a==b? aY==cY? aDM : aDMY : aY==bY? aM==bM? aD==1 &&
      shift(b).slice(8)==1? 'весь '+aMY : aY==cY? 'c '+aD+' по '+bDM :
      'c '+aD+' по '+bDMY : aY==cY? 'c '+aDM+' до '+bDM : aDMY+' - '+bDMY
      : aDMY+' - '+bDMY)
  },
  updDatesTotal =(minDate, maxDate)=> {
    const a = new Date(state.dates[0]=='начала'? minDate : state.dates[0]),
          b = new Date(state.dates[1]=='конца'?  maxDate : state.dates[1]),
          days = ((b-a)/864e5|0)+1,  weeks = days/7|0
    datesTotal.dataset.count = days+` д${end5(days)}${weeks? ` (${weeks}${
      days%7? '+ недель' : ` недел${end6(weeks)}`})` :''}`
  },

  arrowMove = e => {
    if (e.target==body) {
      const middle = tasks.child((taskList.scrollTop+taskList.clientHeight/2)
        * tasks.all().length / tasks.clientHeight |0)
      !(middle.first() || middle.prev().first()).focus()
    }
    const el = document.activeElement,  id = el.parent().id,
          dayShift = e.shiftKey && state.sort2=='byDay' && el.id=='task'
    if (e.key[5]=='U') {
      if (dayShift)
        updState(s => getTask(id).day = shift(getTask(id).day, s.dir? -1 : 1)),
        tasks.child(`[id="${id}"]`).child(1).focus()
      else (el.parent().prev('li') || el.parent()).child(el.i()).focus()
    }
    else if (e.key[5]=='L') (el.prev() || el).focus()
    else if (e.key[5]=='R') (el.next() || el).focus()
    else {
      if (dayShift)
        updState(s => getTask(id).day = shift(getTask(id).day, s.dir? 1 : -1)),
        tasks.child(`[id="${id}"]`).child(1).focus()
      else (el.parent().next('li') || el.parent()).child(el.i()).focus()
    }
  },

  enterBlur = e => e.key=='Enter'? e.target.blur() :0,

  daySwitch =()=> updState(s => s.only = s.only=='days'? 'dates':'days')



let state = { v: 0, input: '', sort1: 'byDone', dir1: '', sort2: 'byDay',
              dir2: '', hidden: ["views", "sorts", "filters"], done:'all',
              filter:'', only: 'days', days: ['все','все'],
              dates: ['начала','конца'], id: 3, tasks: [
                {id: 1, name: "Помыть посуду", done: 0, day: date2day()},
                {id: 2, name: "Вынести мусор", done: 0, day: date2day()},
                {id: 3, name: "Захватить мир", done: 0, day: date2day()},
              ] }

syncStore(), syncView()