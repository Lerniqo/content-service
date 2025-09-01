import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Concepts Import (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should retrieve the root concept (Ordinary Level Mathematics)', () => {
    return request(app.getHttpServer())
      .get('/concepts/OLM001')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeDefined();
        expect(res.body.id).toBe('OLM001');
        expect(res.body.name).toBe('Ordinary Level Mathematics');
        expect(res.body.type).toBe('Subject');
      });
  });

  it('should retrieve a Matter concept (Numbers)', () => {
    return request(app.getHttpServer())
      .get('/concepts/MAT001')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeDefined();
        expect(res.body.id).toBe('MAT001');
        expect(res.body.name).toBe('Numbers');
        expect(res.body.type).toBe('Matter');
      });
  });

  it('should retrieve a Molecule concept (Fractions)', () => {
    return request(app.getHttpServer())
      .get('/concepts/MOL001')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeDefined();
        expect(res.body.id).toBe('MOL001');
        expect(res.body.name).toBe('Fractions');
        expect(res.body.type).toBe('Molecule');
      });
  });

  it('should retrieve an Atom concept (Multiplication of Fractions)', () => {
    return request(app.getHttpServer())
      .get('/concepts/ATM001')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeDefined();
        expect(res.body.id).toBe('ATM001');
        expect(res.body.name).toBe('Multiplication of Fractions');
        expect(res.body.type).toBe('Atom');
      });
  });

  it('should retrieve a Particle concept (fraction-multiplication)', () => {
    return request(app.getHttpServer())
      .get('/concepts/PAR001')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeDefined();
        expect(res.body.id).toBe('PAR001');
        expect(res.body.name).toBe('fraction-multiplication');
        expect(res.body.type).toBe('Particle');
      });
  });

  it('should retrieve children of a concept', () => {
    return request(app.getHttpServer())
      .get('/concepts/MOL001/children')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeDefined();
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        
        // Check that all children are Atoms
        res.body.forEach((child: any) => {
          expect(child.type).toBe('Atom');
        });
      });
  });

  it('should retrieve parent of a concept', () => {
    return request(app.getHttpServer())
      .get('/concepts/MOL001/parent')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeDefined();
        expect(res.body.id).toBe('MAT001');
        expect(res.body.name).toBe('Numbers');
        expect(res.body.type).toBe('Matter');
      });
  });
});