// src/state.js
const HISTORY_CAP = 100;

export function initialState() {
  return {
    channels: ["#general"],
    users: {},
    history: { "#general": [] },
    statuses: {},
  };
}

export function reduce(state, action) {
  switch (action.type) {
    case "join": {
      const users = {
        ...state.users,
        [action.userId]: {
          name: action.name,
          avatar: action.avatar,
          color: action.color,
          presence: "online",
          statusText: "",
        },
      };
      return { ...state, users };
    }
    case "leave": {
      const users = { ...state.users };
      delete users[action.userId];
      return { ...state, users };
    }
    case "message": {
      const chan = action.channel;
      const prev = state.history[chan] ?? [];
      const next = [...prev, { from: action.from, text: action.text, ts: action.ts }];
      const capped = next.slice(-HISTORY_CAP);
      return { ...state, history: { ...state.history, [chan]: capped } };
    }
    case "presence": {
      const u = state.users[action.userId];
      if (!u) return state;
      return {
        ...state,
        users: { ...state.users, [action.userId]: { ...u, presence: action.presence } },
      };
    }
    case "status": {
      const u = state.users[action.userId];
      if (!u) return state;
      return {
        ...state,
        users: { ...state.users, [action.userId]: { ...u, statusText: action.statusText } },
      };
    }
    case "channel": {
      if (action.action === "create" && !state.channels.includes(action.name)) {
        return {
          ...state,
          channels: [...state.channels, action.name],
          history: { ...state.history, [action.name]: [] },
        };
      }
      return state;
    }
    default:
      return state;
  }
}
