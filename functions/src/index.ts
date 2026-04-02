import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Listen for changes to qa_items to generate history and notifications
export const onQAItemUpdated = functions.firestore
  .document("qa_items/{itemId}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    const itemId = context.params.itemId;

    const changes: any[] = [];
    const fieldsToCheck = ["title", "description", "priority", "module", "assignee", "currentFlow", "version"];

    fieldsToCheck.forEach(field => {
      if (newValue[field] !== previousValue[field]) {
        changes.push({
          field,
          oldValue: previousValue[field] || null,
          newValue: newValue[field] || null
        });
      }
    });

    if (changes.length > 0) {
      // Record History
      await db.collection(`qa_items/${itemId}/history`).add({
        userId: "system",
        userName: "System",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        changes
      });

      // Handle Notifications
      const criticalStatuses = ["退回重修", "已修正待測試", "已結案"];
      
      // Status Change Notification
      if (newValue.currentFlow !== previousValue.currentFlow && criticalStatuses.includes(newValue.currentFlow)) {
        if (previousValue.authorUID) {
          await db.collection("notifications").add({
            userId: previousValue.authorUID,
            fromUserId: "system",
            fromUserName: "System",
            itemId: itemId,
            itemTitle: previousValue.title || previousValue.description.substring(0, 30),
            type: "status_change",
            oldValue: previousValue.currentFlow,
            newValue: newValue.currentFlow,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      // Assignment Notification
      if (newValue.assignee !== previousValue.assignee) {
        // Find user by displayName
        const usersSnapshot = await db.collection("users").where("displayName", "==", newValue.assignee).get();
        if (!usersSnapshot.empty) {
          const recipientUid = usersSnapshot.docs[0].id;
          await db.collection("notifications").add({
            userId: recipientUid,
            fromUserId: "system",
            fromUserName: "System",
            itemId: itemId,
            itemTitle: previousValue.title || previousValue.description.substring(0, 30),
            type: "assignment",
            oldValue: previousValue.assignee,
            newValue: newValue.assignee,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
  });

export const migrateComments = functions.https.onRequest(async (req, res) => {
  const qaItemsSnapshot = await db.collection("qa_items").get();
  const batch = db.batch();
  let count = 0;

  for (const doc of qaItemsSnapshot.docs) {
    const data = doc.data();
    if (data.comments && Array.isArray(data.comments) && data.comments.length > 0) {
      for (const comment of data.comments) {
        const commentRef = doc.ref.collection("comments").doc();
        batch.set(commentRef, {
          ...comment,
          createdAt: comment.createdAt || admin.firestore.FieldValue.serverTimestamp()
        });
        count++;
      }
      batch.update(doc.ref, { comments: admin.firestore.FieldValue.delete() });
    }
  }

  await batch.commit();
  res.send(`Migrated ${count} comments.`);
});
