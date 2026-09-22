/* Per-device UGC report/block helpers for the guest web. No report list is read back. */
(function (root) {
  'use strict';
  var BLOCK_KEY = 'swipetrip:duo:blocked-curators:v1';

  function read(storage) {
    try {
      var raw = storage.getItem(BLOCK_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(function (id) { return typeof id === 'string' && id; }) : [];
    } catch (_) { return []; }
  }
  function blockedIds(storage) { return new Set(read(storage)); }
  function filterCandidates(candidates, ids) {
    return candidates.filter(function (candidate) {
      return !candidate.curatorId || !ids.has(String(candidate.curatorId));
    });
  }
  function block(storage, curatorId) {
    if (!curatorId) return blockedIds(storage);
    var ids = blockedIds(storage);
    ids.add(String(curatorId));
    try { storage.setItem(BLOCK_KEY, JSON.stringify(Array.from(ids))); } catch (_) {}
    return ids;
  }
  async function report(client, submissionId, reporterDevice) {
    if (!submissionId || !reporterDevice) throw new Error('REPORT_TARGET_INVALID');
    var result = await client.from('content_reports').insert({
      target_type: 'place_submission', target_id: String(submissionId),
      reporter_device: String(reporterDevice), reason: 'other', detail: null,
    });
    if (!result.error) return 'accepted';
    if (result.error.code === '23505' || /duplicate key/i.test(result.error.message || '')) return 'already';
    throw new Error('REPORT_UNAVAILABLE');
  }
  var api = { BLOCK_KEY: BLOCK_KEY, blockedIds: blockedIds, filterCandidates: filterCandidates, block: block, report: report };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SwipeTripUgcSafety = api;
})(typeof window !== 'undefined' ? window : globalThis);
