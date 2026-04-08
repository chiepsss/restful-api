import express, { Request, Response, NextFunction } from 'express';
import { Movie } from './types/movie';
import { validateMovieFields } from './validators/movie';
import { getPhoneCombinations } from './utils/phoneCombinations';
import { 
    asyncHandler, 
    findMovie, 
    getNextId, 
    movies, 
    resetMovies 
} from './middlewares/movie';

export const app = express();

app.use(express.json());
app.set('json spaces', 2);

// Logs every incoming request with method and URL
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Add a movie
app.post('/movies', asyncHandler((req: Request, res: Response) => {
    const { title, director } = req.body;

    const errors = validateMovieFields({ 
        title, 
        director 
    }, true);

    if (errors.length > 0) return res.status(400).json({ errors });

    const movie: Movie = {
        id: getNextId(),
        title: title.trim(),
        director: director.trim(),
    };

    movies.push(movie);
    return res.status(201).json(movie);
}));

// Get all movies
app.get('/movies', asyncHandler((_req: Request, res: Response) => {
    return res.status(200).json(movies);
}));

// Get one movie
app.get('/movies/:id', findMovie, asyncHandler((_req: Request, res: Response) => {
    return res.status(200).json(res.locals.movie);
}));

// Update a movie
app.put('/movies/:id', findMovie, asyncHandler((req: Request, res: Response) => {
    const { title, director } = req.body;

    const errors = validateMovieFields(
        { title, director }, 
    false);
    
    if (errors.length > 0) return res.status(400).json({ errors });

    const index = movies.findIndex(m => m.id === res.locals.id);

    movies[index] = {
        ...movies[index],
        ...(title !== undefined && { title: title.trim() }),
        ...(director !== undefined && { director: director.trim() }),
        id: movies[index].id,
    };

    return res.status(200).json(movies[index]);
}));

// Delete a movie
app.delete('/movies/:id', findMovie, asyncHandler((_req: Request, res: Response) => {
    const index = movies.findIndex(m => m.id === res.locals.id);
    movies.splice(index, 1);
    return res.status(204).send();
}));


app.get('/phone-combinations', asyncHandler((req: Request, res: Response) => {
  const raw = (req.query.digits as string) ?? '';

  if (raw && !/^[2-9]+$/.test(raw)) {
    return res.status(400).json({ error: 'Input must only contain digits from 2 to 9' });
  }

  const output = getPhoneCombinations(raw);
  return res.status(200).json({ digits: raw, combinations: output });
}));


// Unknown routes handler
app.use((_req: Request, res: Response) => {
    return res.status(404).json({ error: 'Route not found' });
});

// Catches any unhandled errors and returns a generic 500 response
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.message);
    return res.status(500).json({ error: 'Something went wrong' });
});

// Test Helper
export { resetMovies };


// Start the server
app.listen(8000, () => {
    console.log('Server running on http://localhost:8000');
});