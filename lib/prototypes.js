'use strict';

/**
 * Prototypes.
 * (C) 2013 Alex Fernández.
 */


/**
 * Replace all occurrences of a string with the replacement.
 */
String.prototype.replaceAll = function(find, replace)
{
	return this.split(find).join(replace);
}

