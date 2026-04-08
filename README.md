# Code Review

## Q1 - UserDashboard

```javascript
function UserDashboard() {
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
          fetch('/api/users')
          .then(res => res.json())
          .then(data => setUsers(data));
        }, 2000);
    }, []);

    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(filter.toLowerCase()));
    return (
        <div>
            <input 
                onChange={(e) => setFilter(e.target.value)} 
            />
              {filteredUsers.map(user => <UserCard key={user.id} user={user} />
            )}
        </div>
    );
}
```

**Issue 1: Missing cleanup in useEffect**

There is no `return` statement in the `useEffect` to clear the interval when the component unmounts. Just add it at the end of the effect:

```javascript
return () => clearInterval(interval);
```

**Issue 2: No error handling on fetch**

When the request fails, there is no `.catch` so the error goes unnoticed. Add a `.catch` and check if the response is okay:

```javascript
fetch('/api/users')
  .then(res => {
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  })
  .then(data => setUsers(data))
  .catch(err => console.error(err));
```

**Issue 3: `filteredUsers` recomputes every render**

Even when `users` and `filter` have not changed, the `.filter()` still runs on every render. Wrap it in `useMemo`:

```javascript
const filteredUsers = useMemo(() =>
  users.filter(u =>
    u.name.toLowerCase().includes(filter.toLowerCase())
  ),
  [users, filter]
);
```

**Issue 4: Uncontrolled input**

The `input` has an `onChange` but no `value` prop. Just add it:

```javascript
<input value={filter} onChange={(e) => setFilter(e.target.value)} />
```

---

## Q2 - updateUserProfile

```javascript
async function updateUserProfile(userId, newData) {
    const user = await db.users.findById(userId);

    user.profileViews += 1;

    const updated = { ...user, ...newData };

    await db.users.update(userId, updated);

    return updated;
}
```

**Issue 1: No validation on `newData`**

Fields like `is_active` or `role` can be passed in and overwrite sensitive data. Whitelist the allowed fields only

```javascript
const allowedFields = ['name', 'email', 'bio'];
const sanitized = {};

for (const key of allowedFields) {
  if (key in newData) {
    sanitized[key] = newData[key];
  }
}
```

**Issue 2: No null check on user**

If the user is not found, `user.profileViews += 1` will throw a silent error. Add a guard:

```javascript
if (!user) throw new Error('User not found');
```

**Issue 3: Race condition on `profileViews`**

When two requests come in at the same time, both will `findById` and get the same value of `profileViews` - one of the increments will be lost. Use atimoc operation on DB level instead:

```javascript
await db.users.increment(userId, { profileViews: 1 });
```

**Issue 4: `return updated` is not the actual DB state**

The returned object is locally constructed and not guaranteed to match what was actually saved in the DB. Fetch it again after the update:

```javascript
await db.users.update(userId, updated);
return await db.users.findById(userId);
```

---

## Practicel Exam 1 - restful-api

A RESTful API built with **Express** and **TypeScript** that demonstrates full CRUD operations on a movie resource, along with a utility endpoint for generating phone button letter combinations.

---

## Project Structure

```
restful-api/
├── constants/movie.ts
├── middlewares/movie.ts
├── tests/movie.test.ts
├── types/movie.ts
├── utils/phoneCombinations.ts
├── validators/movie.ts
├── app.ts
├── package.json
└── tsconfig.json
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/chiepsss/restful-api.git
cd restful-api

# 2. Install dependencies
npm install
```

---

## Running the Server

```bash
npm start
```

Server will be available at `http://localhost:8000`.

---

## Running the Tests

```bash
npm test
```

---

## API Endpoints

### Movies

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/movies` | Create a new movie |
| GET | `/movies` | Get all movies |
| GET | `/movies/:id` | Get a single movie by ID |
| PUT | `/movies/:id` | Update a movie (partial updates supported) |
| DELETE | `/movies/:id` | Delete a movie |

---

## Usage Examples (cURL)

### Create a movie
```bash
curl -X POST http://localhost:8000/movies \
  -H "Content-Type: application/json" \
  -d '{"title": "Inception", "director": "Christopher Nolan"}'
```

### Get all movies
```bash
curl http://localhost:8000/movies
```

### Get a single movie
```bash
curl http://localhost:8000/movies/1
```

### Update a movie (partial update supported)
```bash
curl -X PUT http://localhost:8000/movies/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Interstellar"}'
```

### Delete a movie
```bash
curl -X DELETE http://localhost:8000/movies/1
```

---

## Design & Approach

### Why Express + TypeScript?

I went with Express because it is minimal any particular structure, which gave me full control over how I organized the CRUD logic without fighting the framework. 
I added TypeScript on top to get type safety throughout the request/response so any shapes/types mismatches get caught at compilation.

### In-memory store instead of a database

My focus for this exercise was the HTTP layer and the CRUD operations themselves, I kept the data in a module level array inside middlewares/movie.ts. 
It keeps the project dependency free and easy to run, and I exposed a resetMovies() function so the store can be wiped clean between test runs without any side effects leaking across test cases.

### Separation of concerns across files

I didn't want everything crammed into `app.ts`, so I split the responsibilities out into their own files.

- `types/movie.ts` defines what a Movie looks like.
- `constants/movie.ts` holds the field constraints in one place, that way the validation logic and the test assertions are always referencing the same values.
- `validators/movie.ts` handles all the field checking and returns an error array. I added a `requireAll` flag so I could reuse the same function for both POST (where missing fields are an error) and PUT (where they're just skipped to support partial updates).
- `middlewares/movie.ts` holds `findMovie`, which sorts out the ID lookup before the route handler even runs, and `asyncHandler`, which wraps each handler so any thrown error gets forwarded to the global error handler automatically, removing the need for try/catch blocks on every route.

The end result is that each route handler only deals with its own responsibilities.

### Route design decisions

- `GET /movies` returns all movies in the store as a JSON array, empty array if none exist yet.
- `GET /movies/:id` fetches a single movie by ID, routed through `findMovie` first to handle invalid or missing IDs before the handler runs.
- `POST /movies` requires both `title` and `director`, missing either returns a `400` with a descriptive error array.
- `PUT /movies/:id` accepts partial payloads, only the fields provided are updated; the `id` is always preserved regardless of what is sent in the body.
- `DELETE /movies/:id` returns `204 No Content` on success, which is the standard response for a successful deletion with no body.
- All routes that reference `:id` pass through the `findMovie` middleware first, which validates that the ID is numeric and that the corresponding movie exists, returning `400` or `404` before the handler runs.

### Error handling

A catch-all error handler at the bottom of `app.ts` handles any unhandled exceptions from async routes (surfaced by `asyncHandler`). A 404 handler above it catches any requests to undefined routes. This way, error responses are consistent throughout the app without scattering try/catch blocks across every route.

---

## Practicel Exam 2 - Phone Button Letter Combinations

### Approach

The utility function in `utils/phoneCombinations.ts` uses a **step-by-step expansion** strategy. 

## Usage Examples (cURL)


| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/phone-combinations?digits=` | Get all letter combinations for given digits (2–9) |

```bash
# Two digits
curl "http://localhost:8000/phone-combinations?digits=23"
# Output: {"digits":"23","combinations":["ad","ae","af","bd","be","bf","cd","ce","cf"]}

# Single digit
curl "http://localhost:8000/phone-combinations?digits=2"
# Output: {"digits":"2","combinations":["a","b","c"]}

# Empty input
curl "http://localhost:8000/phone-combinations?digits="
# Output: {"digits":"","combinations":[]}

# Invalid input (non 2-9 digits)
curl "http://localhost:8000/phone-combinations?digits=123"
# Output: {"error":"Input must only contain digits from 2 to 9"}
```


### Phone map reference

| Digit | Letters |
|-------|---------|
| 2 | a b c |
| 3 | d e f |
| 4 | g h i |
| 5 | j k l |
| 6 | m n o |
| 7 | p q r s |
| 8 | t u v |
| 9 | w x y z |


---

## Running the Tests

```bash
npm test

# Run in the root folder restful-api
```

Tests are located in `tests/movie.test.ts` and cover all CRUD endpoints using the AAA (Arrange, Act, Assert) pattern. 
The store is reset before each test via `beforeEach(() => resetMovies())` to prevent state from leaking between test cases.

### What is covered

- `POST /movies` - creating movies, field validation, whitespace trimming, auto increment IDs
- `GET /movies` - empty store, returning all movies
- `GET /movies/:id` - single movie lookup, invalid ID format, non-existent ID
- `PUT /movies/:id` - full and partial updates, ID preservation, empty field validation
- `DELETE /movies/:id` - successful deletion, verifying removal, non-existent ID
```