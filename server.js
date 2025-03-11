// const express = require('express');
// const { createServer } = require('http');
// const { Server } = require('socket.io');
// const mysql = require('mysql2');
// const cors = require('cors');

// const app = express();
// const httpServer = createServer(app);
// const io = new Server(httpServer, {
//   cors: {
//     origin: "http://localhost:5173", // Vue前端地址
//     methods: ["GET", "POST"]
//   }
// });

// app.use(cors());
// app.use(express.json());

// // 数据库连接配置
// const pool = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: '123456',
//   database: 'library_management',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// // 获取所有弹幕
// app.get('/api/danmus', async (req, res) => {
//   try {
//     const [rows] = await pool.promise().query('SELECT * FROM danmus ORDER BY create_time DESC');
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // // 提交新弹幕
// // app.post('/api/danmus', async (req, res) => {
// //   const { content, color } = req.body;
// //   if (!content) return res.status(400).json({ error: '内容不能为空' });

// //   try {
// //     const [result] = await pool.promise().query(
// //       'INSERT INTO danmus (content, color) VALUES (?, ?)',
// //       [content, color || '#ffffff']
// //     );
// //     res.json({ id: result.insertId });
// //   } catch (err) {
// //     res.status(500).json({ error: err.message });
// //   }
// // });

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
// // WebSocket连接处理
// io.on('connection', (socket) => {
//   console.log('客户端已连接:', socket.id);

//   // 发送历史弹幕（最近50条）
//   socket.on('requestHistory', async () => {
//     try {
//       const [rows] = await pool.promise().query(
//         'SELECT * FROM danmus ORDER BY create_time DESC LIMIT 50'
//       );
//       socket.emit('historyDanmus', rows.reverse()); // 按时间正序发送
//     } catch (err) {
//       console.error('获取历史弹幕失败:', err);
//     }
//   });

//   // 断开连接处理
//   socket.on('disconnect', () => {
//     console.log('客户端断开:', socket.id);
//   });
// });

// // 修改POST接口广播新弹幕
// app.post('/api/danmus', async (req, res) => {
//   const { content, color } = req.body;
//   if (!content) return res.status(400).json({ error: '内容不能为空' });

//   try {
//     const [result] = await pool.promise().query(
//       'INSERT INTO danmus (content, color) VALUES (?, ?)',
//       [content, color || '#ffffff']
//     );
    
//     // 构建新弹幕对象
//     const newDanmu = {
//       id: result.insertId,
//       content,
//       color: color || '#ffffff',
//       create_time: new Date()
//     };

//     // 广播给所有客户端
//     io.emit('newDanmu', newDanmu);
    
//     res.json({ id: result.insertId });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// httpServer.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });




const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// 配置中间件（必须放在路由之前）
app.use(cors({
  origin: 'http://localhost:5173', // 显式配置CORS
  credentials: true
}));
app.use(express.json());

// 数据库连接配置
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'library_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 初始化Socket.io（必须在httpServer之后）
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// ========== HTTP路由 ==========
// 获取所有弹幕（测试用）
app.get('/api/danmus', async (req, res) => {
  try {
    const [rows] = await pool.promise().query(
      'SELECT * FROM danmus ORDER BY create_time DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 提交新弹幕（带广播功能）
app.post('/api/danmus', async (req, res) => {
  const { content, color } = req.body;
  if (!content) return res.status(400).json({ error: '内容不能为空' });

  try {
    const [result] = await pool.promise().query(
      'INSERT INTO danmus (content, color) VALUES (?, ?)',
      [content, color || '#ffffff']
    );
    
    // 构建新弹幕对象
    const newDanmu = {
      id: result.insertId,
      content,
      color: color || '#ffffff',
      create_time: new Date()
    };

    // 广播给所有客户端
    io.emit('newDanmu', newDanmu);
    
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== WebSocket处理 ==========
io.on('connection', (socket) => {
  console.log('客户端已连接:', socket.id);

  // 发送历史弹幕（最近50条）
  socket.on('requestHistory', async () => {
    try {
      const [rows] = await pool.promise().query(
        'SELECT * FROM danmus ORDER BY create_time DESC LIMIT 50'
      );
      socket.emit('historyDanmus', rows.reverse());
    } catch (err) {
      console.error('获取历史弹幕失败:', err);
      socket.emit('historyError', '无法加载历史弹幕');
    }
  });

  socket.on('disconnect', () => {
    console.log('客户端断开:', socket.id);
  });
});

// ========== 启动服务 ==========
const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});