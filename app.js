import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
  
  const firebaseConfig = {
    apiKey: "AIzaSyDhWJjF7m7ei-s9govmEYdjomVPJoxQinQ",
    authDomain: "educatebuddy-d8460.firebaseapp.com",
    projectId: "educatebuddy-d8460",
    storageBucket: "educatebuddy-d8460.firebasestorage.app",
    messagingSenderId: "139681483106",
    appId: "1:139681483106:web:26aaeb7fe5eea45f30043b",
  };

// setup firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// get elements from HTML
const email = document.getElementById("email");
const password = document.getElementById("password");
const msg = document.getElementById("msg");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const authBox = document.getElementById("authBox");
const dashBox = document.getElementById("dashBox");

const groupNameInput = document.getElementById("groupName");
const createGroupBtn = document.getElementById("createGroupBtn");

const groupMsg = document.getElementById("groupMsg");
const groupList = document.getElementById("groupList");

const groupCodeInput = document.getElementById("groupCode");
const joinGroupBtn = document.getElementById("joinGroupBtn");

const chatTitle = document.getElementById("chatTitle");
const chatHint = document.getElementById("chatHint");
const chatBox = document.getElementById("chatBox");

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendMsgBtn = document.getElementById("sendMsgBtn");

const resendBtn = document.getElementById("resendBtn");

let currentGroupId = null;
let unsubscribeMessages = null;

// helper message function
function showMessage(text, isError = true) {
  msg.textContent = text;
  msg.style.color = isError ? "red" : "green";
}

// SIGN UP
signupBtn.addEventListener("click", async () => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.value, password.value);

    await sendEmailVerification(cred.user);

    showMessage("Account created ✅ Check your email to verify before logging in.", false);

    await signOut(auth); // force them to verify first
  } catch (error) {
    showMessage(error.message, true);
  }
});


// LOGIN
loginBtn.addEventListener("click", async () => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.value, password.value);

    if (!cred.user.emailVerified) {
      showMessage("Please verify your email first. Check your inbox.", true);
      await signOut(auth);
      return;
    }

    showMessage("Logged in ✅", false);
  } catch (error) {
    showMessage(error.message, true);
  }
});

if (resendBtn) {
  resendBtn.addEventListener("click", async () => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.value, password.value);

      if (cred.user.emailVerified) {
        showMessage("Your email is already verified ✅", false);
        return;
      }

      await sendEmailVerification(cred.user);
      showMessage("Verification email resent ✅ Check inbox/spam (may take 1–2 mins).", false);

      await signOut(auth);
    } catch (error) {
      showMessage(error.message, true);
    }
  });
}



// LOGOUT
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  
  chatBox.style.display = "none";
  chatTitle.textContent = "Group Chat";
  chatHint.textContent = "Click a group above to open its chat.";
  currentGroupId = null;
  if (unsubscribeMessages) unsubscribeMessages();

});

// SHOW correct box depending on login state
onAuthStateChanged(auth, (user) => {
  if (user) {
    authBox.style.display = "none";
    dashBox.style.display = "block";
    loadMyGroups(); //
  } else {
    dashBox.style.display = "none";
    authBox.style.display = "block";
  }
});

createGroupBtn.addEventListener("click", async () => {
  const groupName = groupNameInput.value.trim();

  if (groupName === "") {
    groupMsg.style.color = "red";
    groupMsg.textContent = "Please enter a group name";
    return;
  }

  try {
    const groupCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const created = await addDoc(collection(db, "groups"), {
      name: groupName,
      code: groupCode,
      createdAt: new Date()
    });

    const user = auth.currentUser;
    await addDoc(collection(db, "memberships"), {
      userId: user.uid,
      groupId: created.id,
      groupName: groupName,
      groupCode: groupCode,
      joinedAt: new Date()
    });

    groupMsg.style.color = "green";
    groupMsg.textContent = `Group created ✅ Code: ${groupCode}`;
    groupNameInput.value = "";

    loadMyGroups();
  } catch (error) {
    console.error(error);
    groupMsg.style.color = "red";
    groupMsg.textContent = "Error creating group";
  }
});

joinGroupBtn.addEventListener("click", async () => {
  const code = groupCodeInput.value.trim().toUpperCase();

  if (code === "") {
    groupMsg.style.color = "red";
    groupMsg.textContent = "Please enter a group code";
    return;
  }

  try {
    const q1 = query(collection(db, "groups"), where("code", "==", code));
    const snap1 = await getDocs(q1);
    if (snap1.empty) {
      groupMsg.style.color = "red";
      groupMsg.textContent = "No group found with that code";
      return;
    }

    const groupDoc = snap1.docs[0];
    const groupId = groupDoc.id;
    const groupData = groupDoc.data();

    const user = auth.currentUser;
    const q2 = query(
      collection(db, "memberships"),
      where("userId", "==", user.uid),
      where("groupId", "==", groupId)
    );
    const snap2 = await getDocs(q2);

    if (!snap2.empty) {
      groupMsg.style.color = "orange";
      groupMsg.textContent = "You already joined this group";
      groupCodeInput.value = "";
      return;
    }


    await addDoc(collection(db, "memberships"), {
      userId: user.uid,
      groupId: groupId,
      groupName: groupData.name,
      groupCode: groupData.code,
      joinedAt: new Date()
    });

    groupMsg.style.color = "green";
    groupMsg.textContent = `Joined ✅ ${groupData.name}`;
    groupCodeInput.value = "";

    loadMyGroups();
  } catch (error) {
    console.error(error);
    groupMsg.style.color = "red";
    groupMsg.textContent = "Error joining group";
  }
});

async function loadMyGroups() {
  groupList.innerHTML = "";

  const user = auth.currentUser;
  if (!user) return;

  const q = query(collection(db, "memberships"), where("userId", "==", user.uid));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    const li = document.createElement("li");
    li.textContent = "No groups yet — create one or join with a code.";
    groupList.appendChild(li);
    return;
  }

  snapshot.forEach((doc) => {
    const li = document.createElement("li");

    const btn = document.createElement("button");
    btn.textContent = `${doc.data().groupName} (Code: ${doc.data().groupCode})`;
    btn.style.padding = "10px";
    btn.style.marginBottom = "8px";
    btn.style.width = "100%";
    btn.style.cursor = "pointer";

    btn.addEventListener("click", () => {
      openGroupChat(doc.data().groupId, doc.data().groupName);
    });

    li.appendChild(btn);
    groupList.appendChild(li);
  });
}



function openGroupChat(groupId, groupName) {
  currentGroupId = groupId;

  chatTitle.textContent = `Group Chat: ${groupName}`;
  chatHint.textContent = `You are chatting in "${groupName}"`;
  chatBox.style.display = "block";

  messagesDiv.innerHTML = "";

  if (unsubscribeMessages) unsubscribeMessages();

const q = query(
  collection(db, "messages"),
  where("groupId", "==", groupId),
  orderBy("createdAt", "asc")
);

  unsubscribeMessages = onSnapshot(
    q,
    (snapshot) => {
      messagesDiv.innerHTML = "";

    snapshot.forEach((doc) => {
      const data = doc.data();
      const p = document.createElement("p");
      p.textContent = `${data.senderEmail}: ${data.text}`;
      messagesDiv.appendChild(p);
    });

      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },
    (error) => {
      console.error("CHAT LISTENER ERROR:", error);
    }
  );
}
sendMsgBtn.addEventListener("click", async () => {
  const text = messageInput.value.trim();
  const user = auth.currentUser;

  if (!currentGroupId) {
    alert("Please click a group first");
    return;
  }

  if (text === "") return;

  try {
    await addDoc(collection(db, "messages"), {
      groupId: currentGroupId,
      text: text,
      senderId: user.uid,
      senderEmail: user.email,
      createdAt: serverTimestamp()
    });

    messageInput.value = "";
  } catch (error) {
    console.error(error);
    alert("Error sending message");
  }
});
