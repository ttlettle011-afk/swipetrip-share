/* UGC candidates persist references; resolve current visibility before rendering. */
(function (root) {
  'use strict';
  async function resolve(client, candidates) {
    var refs = candidates.filter(function (c) { return c.submissionId || c.source === 'ugc'; });
    if (!refs.length) return candidates;
    var ids = refs.map(function (c) { return c.id; });
    var result = await client.rpc('get_ugc_discovery_cards', { p_ids: ids });
    if (result.error) throw new Error('추천 장소를 확인하지 못했어요');
    var rows = result.data || [];
    var byId = new Map();
    for (var r of rows) {
      if (byId.has(Number(r.id))) continue;
      var paths = r.ugc && r.ugc.photoPaths || [];
      var photos;
      try { photos = paths.length ? await client.storage.from('ugc-photos').createSignedUrls(paths, 3600) : { data: [] }; }
      catch (_) { continue; }
      // 한 후보의 사진 서명 실패가 방 전체를 오류 화면으로 보내면 안 된다. 해당
      // UGC만 이번 표시에서 빼고, 독립 공개 장소가 있으면 아래 fallback이 복구한다.
      if (photos.error) continue;
      var first = (photos.data || []).find(function (p) { return p.signedUrl && !p.error; });
      if (!first) continue;
      byId.set(Number(r.id), { id: Number(r.id), name: r.name, image: first ? first.signedUrl : null,
        region: r.region, category: r.category, source: r.source, submissionId: r.ugc && r.ugc.submissionId,
        curatorId: r.ugc && r.ugc.curatorId, nickname: r.ugc && r.ugc.nickname });
    }
    // A withdrawn recommendation may still have independent public place information.
    var missing = refs.filter(function (c) { return !byId.has(Number(c.id)); }).map(function (c) { return c.id; });
    if (missing.length) {
      var publicRows = await client.from('places').select('id,name,region,category,image_urls,source')
        .in('id', missing).eq('public_safe', true);
      if (publicRows.error) throw new Error('장소 게시 상태를 확인하지 못했어요');
      (publicRows.data || []).forEach(function (p) {
        if (['kakao', 'google', 'merged', 'naver', 'ugc'].includes(p.source)) return;
        byId.set(Number(p.id), { id: Number(p.id), name: p.name, region: p.region, category: p.category,
          image: (p.image_urls || [])[0] || null, source: p.source });
      });
    }
    return candidates.flatMap(function (c) {
      if (!c.submissionId && c.source !== 'ugc') return [c];
      return byId.has(Number(c.id)) ? [byId.get(Number(c.id))] : [];
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { resolve: resolve };
  else root.SwipeTripUgc = { resolve: resolve };
})(typeof window !== 'undefined' ? window : this);
