/**
 * http://stackoverflow.com/a/38676384/1127848
 */
class DateFormat {
  /**
   * @return {string[]} List of months in a yer
   */
  get monthNames() {
    return [
      'January', 'February', 'March',
      'April', 'May', 'June', 'July',
      'August', 'September', 'October',
      'November', 'December',
    ];
  }

  /**
   * @return {string[]} List of days in a week
   */
  get days() {
    return [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday',
    ];
  }

  /**
   * @param {number} n A Number to pad
   * @param {number} width A Number to `0` to pad
   * @param {string=} z The value to put as a pad
   * @return {string} Padded string
   */
  pad(n, width, z='0') {
    const ns = String(n);
    return ns.length >= width ? ns : new Array(width - ns.length + 1).join(z) + ns;
  }

  /**
   * Formats the date
   *
   * @param {Date} dt The Date object
   * @param {string} format Format to apply
   * @return {string}
   */
  format(dt, format) {
    format = format.replace('ss', this.pad(dt.getSeconds(), 2));
    format = format.replace('s', String(dt.getSeconds()));
    format = format.replace('dd', this.pad(dt.getDate(), 2));
    format = format.replace('d', String(dt.getDate()));
    format = format.replace('mm', this.pad(dt.getMinutes(), 2));
    format = format.replace('m', String(dt.getMinutes()));
    format = format.replace('MMMM', this.monthNames[dt.getMonth()]);
    format = format.replace('MMM', this.monthNames[dt.getMonth()].substring(0, 3));
    format = format.replace('MM', this.pad(dt.getMonth() + 1, 2));
    format = format.replace('M', String(dt.getMonth() + 1));
    format = format.replace('DD', this.days[dt.getDay()]);
    format = format.replace(/D(?!e)/, this.days[dt.getDay()].substring(0, 3));
    format = format.replace('yyyy', String(dt.getFullYear()));
    format = format.replace('YYYY', String(dt.getFullYear()));
    format = format.replace('yy', String(dt.getFullYear()).substring(2));
    format = format.replace('YY', String(dt.getFullYear()).substring(2));
    format = format.replace('HH', this.pad(dt.getHours(), 2));
    format = format.replace('H', String(dt.getHours()));
    return format;
  }
}

const formatter = new DateFormat();

/**
 * Formats the date
 *
 * @param {Date} dt The Date object
 * @param {string} format Format to apply
 * @return {string}
 */
export default (dt, format) => formatter.format(dt, format);
