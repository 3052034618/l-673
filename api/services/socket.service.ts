import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';
import { simulateRealtimeData, getCurrentRealtimeData } from './realtime.service.js';
import { detectAlerts } from './alert.service.js';
import { db } from '../db/memoryStore.js';

let io: SocketIOServer | null = null;
let simulationInterval: NodeJS.Timeout | null = null;

export const initSocket = (server: http.Server) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe:plant', (plantId: string) => {
      socket.join(`plant:${plantId}`);
      const data = getCurrentRealtimeData(plantId);
      socket.emit('realtime:data', data);
    });

    socket.on('unsubscribe:plant', (plantId: string) => {
      socket.leave(`plant:${plantId}`);
    });

    socket.on('subscribe:alerts', () => {
      socket.join('alerts');
    });

    socket.on('unsubscribe:alerts', () => {
      socket.leave('alerts');
    });

    socket.on('subscribe:all', () => {
      socket.join('all_plants');
      const data = getCurrentRealtimeData();
      socket.emit('realtime:all', data);
    });

    socket.on('unsubscribe:all', () => {
      socket.leave('all_plants');
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  startSimulation();

  return io;
};

const startSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  simulationInterval = setInterval(() => {
    if (!io) return;

    try {
      const allNewData = simulateRealtimeData();
      
      allNewData.forEach(data => {
        io?.to(`plant:${data.plantId}`).emit('realtime:data', [data]);
      });

      const allData = getCurrentRealtimeData();
      io?.to('all_plants').emit('realtime:all', allData);

      const newAlerts = detectAlerts(allNewData);
      if (newAlerts.length > 0) {
        io?.to('alerts').emit('alerts:new', newAlerts);
      }
    } catch (error) {
      console.error('Simulation error:', error);
    }
  }, 3000);
};

export const stopSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
};

export const broadcastAlert = (alert: any) => {
  if (!io) return;
  io.to('alerts').emit('alerts:update', alert);
  if (alert.plantId) {
    io.to(`plant:${alert.plantId}`).emit('alerts:update', alert);
  }
};

export const broadcastApproval = (approval: any) => {
  if (!io) return;
  if (approval.plantId) {
    io.to(`plant:${approval.plantId}`).emit('approvals:update', approval);
  }
};

export const getIO = () => io;
