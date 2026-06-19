// src/state.js
const HISTORY_CAP = 100;

export function initialState() {
  return {
    channels: ["#general"],
    channelPrivate: { "#general": false },
    users: {},
    history: { "#general": [] },
    seats: {}, // seatNumber -> userId
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
      const seats = { ...state.seats };
      for (const n of Object.keys(seats)) {
        if (seats[n] === action.userId) delete seats[n];
      }
      return { ...state, users, seats };
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
    case "color": {
      const u = state.users[action.userId];
      if (!u) return state;
      return {
        ...state,
        users: { ...state.users, [action.userId]: { ...u, color: action.color } },
      };
    }
    case "seat": {
      const seats = { ...state.seats };
      // a user occupies at most one seat
      for (const n of Object.keys(seats)) {
        if (seats[n] === action.userId) delete seats[n];
      }
      seats[action.seat] = action.userId;
      return { ...state, seats };
    }
    case "channel": {
      if (action.action === "create" && !state.channels.includes(action.name)) {
        return {
          ...state,
          channels: [...state.channels, action.name],
          channelPrivate: { ...state.channelPrivate, [action.name]: !!action.private },
          history: { ...state.history, [action.name]: [] },
        };
      }
      return state;
    }
    default:
      return state;
  }
}
