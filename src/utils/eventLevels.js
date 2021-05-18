import findIndex from 'lodash/findIndex'
import * as dates from './dates'

export function endOfRange(dateRange, unit = 'day') {
  return {
    first: dateRange[0],
    last: dates.add(dateRange[dateRange.length - 1], 1, unit),
  }
}

export function eventSegments(event, range, accessors) {
  // let { first, last } = endOfRange(range)

  // let slots = dates.diff(first, last, 'day')
  // let start = dates.max(dates.startOf(accessors.start(event), 'day'), first)
  // let end = dates.min(dates.ceil(accessors.end(event), 'day'), last)

  // let padding = findIndex(range, x => dates.eq(x, start, 'day'))
  // let span = dates.diff(start, end, 'day')

  // span = Math.min(span, slots)
  // span = Math.max(span, 1)

  // const seg = {
  //   event,
  //   span,
  //   left: padding + 1,
  //   right: Math.max(padding + span, 1),
  // }
  // console.log(seg)
  // return seg

  // custom here
  let { first, last } = endOfRange(range)

  let slots = dates.diff(first, last, 'day')
  let start = dates.max(dates.startOf(accessors.start(event), 'minutes'), first)
  let end = dates.min(dates.ceil(accessors.end(event), 'minutes'), last)

  let padding = findIndex(range, x => dates.eq(x, start, 'day'))

  const oneMinuteSpan = 1 / (24 * 60)
  let span = dates.diff(start, end, 'minutes') * oneMinuteSpan
  let spanLeft = (start.getHours() * 60 + start.getMinutes()) * oneMinuteSpan

  span = Math.min(span, slots)
  span = Math.max(span, 0.1)
  const rs = {
    event,
    span,
    left: padding + 1 + spanLeft,
    right: padding + 1 + spanLeft + span,
  }

  return rs
}

export function eventLevels(rowSegments, limit = Infinity) {
  let i,
    j,
    seg,
    levels = [],
    extra = []

  for (i = 0; i < rowSegments.length; i++) {
    seg = rowSegments[i]

    for (j = 0; j < levels.length; j++) if (!segsOverlap(seg, levels[j])) break

    if (j >= limit) {
      extra.push(seg)
    } else {
      ;(levels[j] || (levels[j] = [])).push(seg)
    }
  }

  for (i = 0; i < levels.length; i++) {
    levels[i].sort((a, b) => a.left - b.left) //eslint-disable-line
  }

  return { levels, extra }
}

export function inRange(e, start, end, accessors) {
  let eStart = dates.startOf(accessors.start(e), 'day')
  let eEnd = accessors.end(e)

  let startsBeforeEnd = dates.lte(eStart, end, 'day')
  // when the event is zero duration we need to handle a bit differently
  let endsAfterStart = !dates.eq(eStart, eEnd, 'minutes')
    ? dates.gt(eEnd, start, 'minutes')
    : dates.gte(eEnd, start, 'minutes')

  return startsBeforeEnd && endsAfterStart
}

export function segsOverlap(seg, otherSegs) {
  return otherSegs.some(
    otherSeg => otherSeg.left <= seg.right && otherSeg.right >= seg.left
  )
}

export function sortEvents(evtA, evtB, accessors) {
  let startSort =
    +dates.startOf(accessors.start(evtA), 'day') -
    +dates.startOf(accessors.start(evtB), 'day')

  let durA = dates.diff(
    accessors.start(evtA),
    dates.ceil(accessors.end(evtA), 'day'),
    'day'
  )

  let durB = dates.diff(
    accessors.start(evtB),
    dates.ceil(accessors.end(evtB), 'day'),
    'day'
  )

  return (
    startSort || // sort by start Day first
    Math.max(durB, 1) - Math.max(durA, 1) || // events spanning multiple days go first
    !!accessors.allDay(evtB) - !!accessors.allDay(evtA) || // then allDay single day events
    +accessors.start(evtA) - +accessors.start(evtB)
  ) // then sort by start time
}
