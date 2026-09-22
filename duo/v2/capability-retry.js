/* Retry only an expired pending vote capability once; never retry arbitrary write failures. */
(function (root) {
  'use strict';
  async function once(operation, invalidate, isInvalid) {
    try { return await operation(); }
    catch (error) {
      if (!isInvalid(error)) throw error;
      invalidate();
      return operation();
    }
  }
  var api = { once: once };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SwipeTripCapabilityRetry = api;
})(typeof window !== 'undefined' ? window : globalThis);
