window.PHOTO_OVERRIDES = {
  "sanya": [
    {
      "src": "260506 - Anniversary Map Assets/三亚 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "shanghai": [
    {
      "src": "260506 - Anniversary Map Assets/上海 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "tokyo": [
    {
      "src": "260506 - Anniversary Map Assets/东京 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "lijiang": [
    {
      "src": "260506 - Anniversary Map Assets/丽江 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "yosemite": [
    {
      "src": "260506 - Anniversary Map Assets/优胜美地 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "beijing": [
    {
      "src": "260506 - Anniversary Map Assets/北京 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "mexico-city": [
    {
      "src": "260506 - Anniversary Map Assets/墨西哥城 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "paris": [
    {
      "src": "260506 - Anniversary Map Assets/巴黎 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "xinjiang": [
    {
      "src": "260506 - Anniversary Map Assets/新疆 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "pebble-beach": [
    {
      "src": "260506 - Anniversary Map Assets/圆石滩 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "liuzhou": [
    {
      "src": "260506 - Anniversary Map Assets/柳州 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "thailand": [
    {
      "src": "260506 - Anniversary Map Assets/泰国 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "macau": [
    {
      "src": "260506 - Anniversary Map Assets/澳门 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "como": [
    {
      "src": "260506 - Anniversary Map Assets/科莫湖 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "new-york": [
    {
      "src": "260506 - Anniversary Map Assets/纽约 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "xian": [
    {
      "src": "260506 - Anniversary Map Assets/西安 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "tibet": [
    {
      "src": "260506 - Anniversary Map Assets/西藏 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "dubai": [
    {
      "src": "260506 - Anniversary Map Assets/迪拜 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "qingdao": [
    {
      "src": "260506 - Anniversary Map Assets/青岛 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ],
  "seoul": [
    {
      "src": "260506 - Anniversary Map Assets/首尔 Memory 01.jpg",
      "date": "2026.05.07"
    }
  ]
};
if (window.MAP_PLACES) {
  window.MAP_PLACES.forEach(function (p) {
    if (window.PHOTO_OVERRIDES[p.id]) p.photos = window.PHOTO_OVERRIDES[p.id];
  });
}
