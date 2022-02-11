// A global variable in one script, is global for all scripts if linked in the HTML.
const randomvar = 'shawn';

// Months is defined in script, but it is linked after other.js, thus we cannot see it
// console.log(months);
// Output: months is not defined
