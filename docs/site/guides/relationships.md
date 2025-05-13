# Working with Relationships

Rex-ORM provides robust support for defining and working with relationships
between models. This guide explains how to use the various relationship
decorators and how to query related data.

## Types of Relationships

Rex-ORM supports four types of relationships:

1. **One-to-One**: A model instance is associated with exactly one instance of
   another model
2. **One-to-Many**: A model instance can be associated with multiple instances
   of another model
3. **Many-to-One**: The inverse of One-to-Many
4. **Many-to-Many**: Model instances can be associated with multiple instances
   of another model, and vice versa

## One-to-One Relationships

A one-to-one relationship is defined using the `@OneToOne` decorator:

```typescript
import {
  BaseModel,
  Column,
  Entity,
  OneToOne,
  PrimaryKey,
} from "https://deno.land/x/rex_orm@v0.1.0/mod.ts";

@Entity({ tableName: "users" })
export class User extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @OneToOne(() => Profile, "user")
  profile!: Profile;
}

@Entity({ tableName: "profiles" })
export class Profile extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "text" })
  bio!: string;

  @Column({ type: "int" })
  userId!: number;

  @OneToOne(() => User, "profile")
  user!: User;
}
```

### Working with One-to-One Relationships

```typescript
// Create a user with a profile
const user = new User();
user.name = "John Doe";
await user.save();

const profile = new Profile();
profile.bio = "I am a developer";
profile.userId = user.id;
await profile.save();

// Load user with profile
const userWithProfile = await User.findOne({
  id: user.id,
}, {
  include: ["profile"],
});

console.log(userWithProfile.profile.bio); // "I am a developer"
```

## One-to-Many and Many-to-One Relationships

One-to-many and many-to-one relationships represent two sides of the same
relationship:

```typescript
@Entity({ tableName: "authors" })
export class Author extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @OneToMany(() => Book, "author")
  books!: Book[];
}

@Entity({ tableName: "books" })
export class Book extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "int" })
  authorId!: number;

  @ManyToOne(() => Author, "books")
  author!: Author;
}
```

### Working with One-to-Many/Many-to-One Relationships

```typescript
// Create an author
const author = new Author();
author.name = "Jane Austen";
await author.save();

// Create books by this author
const book1 = new Book();
book1.title = "Pride and Prejudice";
book1.authorId = author.id;
await book1.save();

const book2 = new Book();
book2.title = "Sense and Sensibility";
book2.authorId = author.id;
await book2.save();

// Load author with books
const authorWithBooks = await Author.findOne({
  id: author.id,
}, {
  include: ["books"],
});

console.log(
  `${authorWithBooks.name} wrote ${authorWithBooks.books.length} books`,
);
// "Jane Austen wrote 2 books"

// Load book with author
const bookWithAuthor = await Book.findOne({
  id: book1.id,
}, {
  include: ["author"],
});

console.log(
  `${bookWithAuthor.title} was written by ${bookWithAuthor.author.name}`,
);
// "Pride and Prejudice was written by Jane Austen"
```

## Many-to-Many Relationships

Many-to-many relationships require a junction table:

```typescript
@Entity({ tableName: "students" })
export class Student extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @ManyToMany(() => Course, "students", {
    through: "student_courses",
    foreignKey: "studentId",
    otherKey: "courseId",
  })
  courses!: Course[];
}

@Entity({ tableName: "courses" })
export class Course extends BaseModel {
  @PrimaryKey()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @ManyToMany(() => Student, "courses", {
    through: "student_courses",
    foreignKey: "courseId",
    otherKey: "studentId",
  })
  students!: Student[];
}
```

### Working with Many-to-Many Relationships

```typescript
// Create a student
const student = new Student();
student.name = "Alice";
await student.save();

// Create courses
const course1 = new Course();
course1.name = "Mathematics";
await course1.save();

const course2 = new Course();
course2.name = "Physics";
await course2.save();

// Associate student with courses
await student.courses.add(course1);
await student.courses.add(course2);

// Load student with courses
const studentWithCourses = await Student.findOne({
  id: student.id,
}, {
  include: ["courses"],
});

console.log(
  `${studentWithCourses.name} is enrolled in ${studentWithCourses.courses.length} courses`,
);
// "Alice is enrolled in 2 courses"

// Load course with students
const courseWithStudents = await Course.findOne({
  id: course1.id,
}, {
  include: ["students"],
});

console.log(
  `${courseWithStudents.name} has ${courseWithStudents.students.length} students`,
);
// "Mathematics has 1 students"
```

## Eager Loading vs. Lazy Loading

By default, relationships are lazily loaded, meaning they are only fetched when
accessed. You can eagerly load relationships using the `include` option:

```typescript
// Lazy loading (relationship data fetched only when accessed)
const user = await User.findOne({ id: 1 });
// This triggers a separate database query
const profile = await user.profile;

// Eager loading (load relationship data in the same query)
const userWithProfile = await User.findOne({
  id: 1,
}, {
  include: ["profile"],
});
// No additional query needed
console.log(userWithProfile.profile.bio);
```

## Nested Relationships

You can include nested relationships using dot notation:

```typescript
// Load author with books, and each book's categories
const author = await Author.findOne({
  id: 1,
}, {
  include: ["books", "books.categories"],
});

// Access nested data
for (const book of author.books) {
  console.log(`Book: ${book.title}`);
  for (const category of book.categories) {
    console.log(`- Category: ${category.name}`);
  }
}
```

## Advanced Relationship Options

Relationship decorators accept various options:

```typescript
@OneToMany(() => Comment, "post", {
  as: "comments",                // Alias for the relationship
  foreignKey: "postId",          // Foreign key column
  onDelete: "CASCADE",           // ON DELETE behavior
  onUpdate: "CASCADE",           // ON UPDATE behavior
  scope: { isPublished: true },  // Default scope for the relationship
})
comments!: Comment[];
```

For more details on working with relationships, check out the
[API Documentation](../../api/index.md).
