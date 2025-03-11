<template>
  <div class="danmu-container">
    <!-- 弹幕发送区域 -->
    <div class="send-box">
      <input v-model="newDanmu" placeholder="输入弹幕内容" @keyup.enter="sendDanmu" />
      <!-- 选择发送数量的下拉框 -->
      <select v-model="selectedCount" class="send-count-dropdown">
        <option v-for="(label, count) in sendCounts" :key="count" :value="count">{{ label }}</option>
      </select>
      <button @click="sendDanmu">发送</button>
    </div>

    <!-- 弹幕展示区域 -->
    <div class="danmu-stage" ref="stage">
      <div
          v-for="(danmu, index) in danmus"
          :key="index"
          class="danmu-item"
          :style="{
          color: danmu.color,
          top: danmu.top + 'px',
          animationDuration: danmu.speed + 's',
          animationPlayState: danmu.isHovered ? 'paused' : 'running'  // 控制动画播放状态
        }"
          @mouseenter="danmu.isHovered = true; danmu.showReportButton = true"
          @mouseleave="danmu.isHovered = false; danmu.showReportButton = false"
      >
        {{ danmu.text }}
        <button
            v-if="danmu.showReportButton"
            class="report-button"
            @click="reportDanmu(danmu)"
            style="top: -20px;"
        >
          举报
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted,onUnmounted } from 'vue'
import axios from 'axios'
import { io } from 'socket.io-client'

const API_URL = 'http://localhost:3000/api/danmus'
const SOCKET_URL = 'http://localhost:3000'


// 弹幕数据
const danmus = reactive([])
const newDanmu = ref('')
const stage = ref(null)
let socket = null
// 用户选择发送的数量
const selectedCount = ref(1);
// 下拉框显示的文本映射
const sendCounts = {
  1: 'x1',
  3: 'x3',
  5: 'x5',
  10: '天神下凡'
};
// 修改发送弹幕的逻辑，根据选择的数量发送
//

// 从服务器获取弹幕
const fetchDanmus = async () => {
  try {
    const response = await axios.get(API_URL)
    const fetchedDanmus = response.data.map(item => createDanmuObject(item.content, item.color))

    // 延迟逐个添加弹幕
    fetchedDanmus.forEach((danmu, index) => {
      setTimeout(() => {
        danmus.push(danmu)
      }, index * 2000)  // 每个弹幕延迟1秒（1000ms）逐个显示
    })
  } catch (err) {
    console.error('获取弹幕失败:', err)
  }
}


// 初始化Socket连接
const initSocket = () => {
  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000
  })

  // 监听新弹幕
  socket.on('newDanmu', (danmu) => {
    danmus.push(createDanmuObject(danmu.content, danmu.color))
  })

  // 请求历史弹幕
  socket.on('connect', () => {
    socket.emit('requestHistory')
  })

  // 接收历史弹幕
  socket.on('historyDanmus', (history) => {
    history.forEach(item => {
      danmus.push(createDanmuObject(item.content, item.color))
    })
  })

  // 错误处理
  socket.on('connect_error', (err) => {
    console.log('连接错误:', err.message)
  })
}

// 发送弹幕（移除之前的axios请求）
const sendDanmu = async () => {
  if (!newDanmu.value.trim()) return
  try {
    await axios.post(API_URL, {
      content: newDanmu.value,
      color: getRandomColor()
    })
    for (let i = 0; i < selectedCount.value - 1; i++) {
      danmus.push(createDanmuObject(newDanmu.value));
    }
    newDanmu.value = ''
  } catch (err) {
    console.error('发送失败:', err)
  }
}

// 组件卸载时断开连接
onUnmounted(() => {
  if (socket) socket.disconnect()
})

// 初始化时连接Socket
onMounted(() => {
  initSocket()
})

// 初始化测试弹幕
const initTestDanmus = () => {
  const testData = [
    { text: '第一条弹幕～', color: '#ff0000' },
    { text: 'Hello World！', color: '#00ff00' },
    { text: 'Vue弹幕测试', color: '#0000ff' },
    { text: '🐳🐳🐳', color: '#ff00ff' }
  ]

  testData.forEach((item, index) => {
    danmus.push(createDanmuObject(item.text, item.color))
  })
}

// 创建弹幕对象
const createDanmuObject = (text, color) => {
  return {
    text,
    color: color || getRandomColor(),
    top: Math.random() * (stage.value?.clientHeight - 30) || 0,
    speed: 8 + Math.random() * 5, // 随机速度 8-13秒
    isHovered:false,
  }
}




// 随机颜色生成
const getRandomColor = () => {
  return '#' + Math.floor(Math.random()*16777215).toString(16)
}

// 举报弹幕
const reportDanmu = (danmu) => {
  alert(`'${danmu.text}' 已举报成功！`)
  // 这里可以做更多的操作，比如发送请求到服务器
}

// 初始化
onMounted(() => {
  initTestDanmus()
  fetchDanmus()
})
</script>

<style scoped>
/* 弹幕项基本样式 */
.danmu-item {
  position: absolute;
  white-space: nowrap;
  font-size: 20px;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
  animation: danmuMove linear;
  animation-fill-mode: forwards;
  padding-right: 30px;  /* 给举报按钮留出空间 */
  animation-play-state: running; /* 默认动画运行 */
}

/* 弹幕滚动动画 */
@keyframes danmuMove {
  from {
    transform: translateX(100vw);
  }
  to {
    transform: translateX(-100%);
  }
}

/* 鼠标悬停时停止动画 */
.danmu-item.paused {
  animation-play-state: paused;
}

/* 弹幕容器 */
.danmu-container {
  position: relative;
  width: 100%;
  height: 400px;
  background: #000;
  overflow: hidden;
}

/* 发送弹幕区域 */
.send-box {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  gap: 10px;
}

/* 输入框样式 */
input {
  padding: 8px 12px;
  width: 200px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

/* 发送按钮样式 */
button {
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* 弹幕显示区域 */
.danmu-stage {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 举报按钮样式 */
.report-button {
  position: absolute;
  left: 50%;
  transform: translateX(-50%); /* 让按钮水平居中 */
  top: -30px;  /* 把按钮放到弹幕的正上方 */
  background-color: red;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}

/* 举报按钮悬停时 */
.report-button:hover {
  background-color: darkred;
}

/* 选择发送数量的下拉框 */
.send-count-dropdown {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-right: 10px;
}

/* 弹幕悬停时添加 paused 类 */
.danmu-item:hover {
  animation-play-state: paused; /* 鼠标悬停时停止滚动 */
}
</style>
