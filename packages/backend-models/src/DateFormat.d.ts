/**
 * http://stackoverflow.com/a/38676384/1127848
 */
declare class DateFormat {
  /**
   * @returns List of months in a yer
   */
  readonly monthNames: string[];
  /**
   * @returns List of days in a week
   */
  readonly days: string[];

  /**
   * @param n A Number to pad
   * @param width A Number to `0` to pad
   * @param z The value to put as a pad
   * @returns Padded string
   */
  pad(n:number, width:number, z?:string): string;

  /**
   * Formats the date
   *
   * @param {Date} dt The Date object
   * @param {string} format Format to apply
   * @return {string}
   */
  format(dt: Date, format: string): string;
}

/**
 * Formats the date
 *
 * @param dt The Date object
 * @param format Format to apply
 */
export default function(dt: Date, format: string): string;
