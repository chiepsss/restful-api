import { Request, Response, NextFunction } from 'express';
import { Movie } from '../types/movie';


export let movies: Movie[] = [];
let nextId = 1; // private never export this directly

// Always use this function to get the next ID.
export const getNextId = (): number => nextId++;

export const resetMovies = () => {
    movies = [];
    nextId = 1;
};

// Wraps route handlers to auto-forward errors to the global error handler
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => any) =>
    (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

// Checks if movie exists before proceeding to the route handler
export const findMovie = (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    const movie = movies.find(m => m.id === id);

    if (!movie) {
        return res.status(404).json({ error: 'Movie not found' });
    }

    res.locals.movie = movie;
    res.locals.id = id;
    next();
};