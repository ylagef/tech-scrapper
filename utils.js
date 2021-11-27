exports.getTimeString = (input = null) => {
  const date = input || new Date()
  const timeString = this.getTwoDigit(date.getHours()) + ':' + this.getTwoDigit(date.getMinutes()) + ':' + this.getTwoDigit(date.getSeconds())
  return timeString
}

exports.getTwoDigit = (input) => {
  if (input < 10) {
    return '0' + input
  }
  return input
}
