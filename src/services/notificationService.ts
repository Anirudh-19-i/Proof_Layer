import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { Notification } from '../types';

export const notificationService = {
  async notifyRecruiter(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to send notification:', e);
    }
  },

  async getNotifications(recruiterId: string): Promise<Notification[]> {
    try {
      // For simplicity in the demo, we fetch all notifications of relevant types
      // In a real app, we'd use where('recruiterId', 'in', [recruiterId, 'all'])
      const q = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
      return [];
    }
  },

  async markAsRead(notificationId: string) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  }
};
