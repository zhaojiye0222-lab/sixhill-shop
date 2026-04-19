Page({
  data: {
    url: ''
  },
  onLoad: function () {
    // 添加时间戳强制微信跳过缓存，获取最新的服务器前端代码
    this.setData({
      url: `http://8.215.108.239/index.html?t=${Date.now()}`
    });
  }
})