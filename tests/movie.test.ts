import request from 'supertest';
import { app, resetMovies } from '../app';

beforeEach(() => {
    resetMovies();
});

describe('POST /movies', () => {
    it('should create a movie and return 201', async () => {
        const payload = { title: 'Inception', director: 'Christopher Nolan' };

        const res = await request(app).post('/movies').send(payload);

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ id: 1, title: 'Inception', director: 'Christopher Nolan' });
    });

    it('should trim whitespace from title and director', async () => {
        const payload = { title: '  Dune  ', director: '  Denis Villeneuve  ' };

        const res = await request(app).post('/movies').send(payload);

        expect(res.status).toBe(201);
        expect(res.body.title).toBe('Dune');
        expect(res.body.director).toBe('Denis Villeneuve');
    });

    it('should return 400 if title is missing', async () => {
        const payload = { director: 'Christopher Nolan' };

        const res = await request(app).post('/movies').send(payload);

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain('title is required');
    });

    it('should return 400 if director is missing', async () => {
        const payload = { title: 'Inception' };

        const res = await request(app).post('/movies').send(payload);

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain('director is required');
    });

    it('should return 400 if both fields are missing', async () => {
        const payload = {};

        const res = await request(app).post('/movies').send(payload);

        expect(res.status).toBe(400);
        expect(res.body.errors).toHaveLength(2);
    });

    it('should return 400 if title exceeds 100 characters', async () => {
        const payload = { title: 'A'.repeat(101), director: 'Someone' };

        const res = await request(app).post('/movies').send(payload);

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain('title must not exceed 100 characters');
    });

    it('should return 400 if director exceeds 50 characters', async () => {
        const payload = { title: 'Inception', director: 'D'.repeat(51) };

        const res = await request(app).post('/movies').send(payload);

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain('director must not exceed 50 characters');
    });

    it('should auto-increment IDs across multiple movies', async () => {
        const first  = { title: 'Inception', director: 'Nolan' };
        const second = { title: 'Dune',      director: 'Villeneuve' };

        const res1 = await request(app).post('/movies').send(first);
        const res2 = await request(app).post('/movies').send(second);

        expect(res1.body.id).toBe(1);
        expect(res2.body.id).toBe(2);
    });
});

describe('GET /movies', () => {
    it('should return an empty array when no movies exist', async () => {
        // Store already reset in beforeEach

        const res = await request(app).get('/movies');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('should return all movies', async () => {
        await request(app).post('/movies').send({ title: 'Inception', director: 'Nolan' });
        await request(app).post('/movies').send({ title: 'Dune', director: 'Villeneuve' });

        const res = await request(app).get('/movies');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });
});

describe('GET /movies/:id', () => {
    it('should return a single movie by ID', async () => {
        await request(app).post('/movies').send({ title: 'Inception', director: 'Nolan' });

        const res = await request(app).get('/movies/1');

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 1, title: 'Inception' });
    });

    it('should return 404 for a non-existent ID', async () => {
        // Store is empty

        const res = await request(app).get('/movies/999');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Movie not found');
    });

    it('should return 400 for a non-numeric ID', async () => {
        // Store is empty

        const res = await request(app).get('/movies/abc');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid ID format');
    });
});

describe('PUT /movies/:id', () => {
    it('should update both fields and return the updated movie', async () => {
        await request(app).post('/movies').send({ title: 'Inception', director: 'Nolan' });

        const res = await request(app).put('/movies/1')
            .send({ title: 'Interstellar', director: 'Christopher Nolan' });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Interstellar');
        expect(res.body.director).toBe('Christopher Nolan');
    });

    it('should allow partial update — title only', async () => {
        await request(app).post('/movies').send({ title: 'Inception', director: 'Nolan' });

        const res = await request(app).put('/movies/1').send({ title: 'Interstellar' });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Interstellar');
        expect(res.body.director).toBe('Nolan');
    });

    it('should allow partial update — director only', async () => {
        await request(app).post('/movies').send({ title: 'Inception', director: 'Nolan' });

        const res = await request(app).put('/movies/1').send({ director: 'Denis Villeneuve' });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Inception');
        expect(res.body.director).toBe('Denis Villeneuve');
    });

    it('should preserve the original ID after update', async () => {
        await request(app).post('/movies').send({ title: 'Inception', director: 'Nolan' });

        const res = await request(app).put('/movies/1').send({ title: 'Interstellar' });

        expect(res.body.id).toBe(1);
    });

    it('should return 400 if title is an empty string', async () => {
        await request(app).post('/movies').send({ title: 'Inception', director: 'Nolan' });

        const res = await request(app).put('/movies/1').send({ title: '   ' });

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain('title cannot be empty');
    });

    it('should return 404 when updating a non-existent movie', async () => {
        // Store is empty

        const res = await request(app).put('/movies/999').send({ title: 'Ghost' });

        expect(res.status).toBe(404);
    });
});

describe('DELETE /movies/:id', () => {
    it('should delete a movie and return 204', async () => {
        await request(app).post('/movies').send({ title: 'Inception', director: 'Nolan' });

        const res = await request(app).delete('/movies/1');

        expect(res.status).toBe(204);
    });

    it('should actually remove the movie from the list', async () => {
        await request(app).post('/movies').send({ title: 'Inception', director: 'Nolan' });

        await request(app).delete('/movies/1');
        const res = await request(app).get('/movies');

        expect(res.body).toHaveLength(0);
    });

    it('should return 404 when deleting a non-existent movie', async () => {
        // Store is empty

        const res = await request(app).delete('/movies/999');

        expect(res.status).toBe(404);
    });
});
