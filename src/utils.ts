export const getTimeString = (input = null) => {
  const date = input || new Date()
  const timeString =
    getTwoDigit(date.getHours()) +
    ':' +
    getTwoDigit(date.getMinutes()) +
    ':' +
    getTwoDigit(date.getSeconds())
  return timeString
}

export const getDateTimeString = (input = null) => {
  const date = input || new Date()
  const timeString =
    getTwoDigit(date.getDate()) +
    '/' +
    getTwoDigit(date.getMonth() + 1) +
    ' ' +
    getTwoDigit(date.getHours()) +
    ':' +
    getTwoDigit(date.getMinutes()) +
    ':' +
    getTwoDigit(date.getSeconds())
  return timeString
}

export const getMinutesSeconds = (seconds: number) => {
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export const getTotalSeconds = (start: Date, end: Date) => {
  return Math.ceil((end.getTime() - start.getTime()) / 1000)
}

export const getTwoDigit = (input) => {
  if (input < 10) {
    return '0' + input
  }
  return input
}
