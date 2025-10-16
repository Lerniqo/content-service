const neo4j = require("neo4j-driver");
const { v4: uuidv4 } = require("uuid");

const driver = neo4j.driver(
  "neo4j+s://7e6f4ad1.databases.neo4j.io",
  neo4j.auth.basic("neo4j", "aVhFUcZeF0Jy-EWYAyTzcsHt-vrdWEJYyVYpi3ErF90"),
  {
    maxConnectionPoolSize: 100,
    connectionTimeout: 60000,
    maxTransactionRetryTime: 30000
  }
);

async function populateDatabase() {
  const session = driver.session();
  const currentTime = neo4j.types.DateTime.fromStandardDate(new Date());

  try {
    // Create indexes for performance
    await session.run(
      "CREATE INDEX syllabusconcept_conceptId IF NOT EXISTS FOR (c:SyllabusConcept) ON (c.conceptId)"
    );
    await session.run(
      "CREATE INDEX syllabusconcept_name IF NOT EXISTS FOR (c:SyllabusConcept) ON (c.name)"
    );
    await session.run(
      "CREATE INDEX syllabusconcept_type IF NOT EXISTS FOR (c:SyllabusConcept) ON (c.type)"
    );
    await session.run(
      "CREATE INDEX resource_resourceId IF NOT EXISTS FOR (r:Resource) ON (r.resourceId)"
    );

    // Create indexes and constraints for User nodes
    await session.run(
      "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE"
    );
    await session.run(
      "CREATE INDEX user_id IF NOT EXISTS FOR (u:User) ON (u.id)"
    );

    // Create indexes and constraints for LearningPath nodes
    await session.run(
      "CREATE CONSTRAINT learningpath_id_unique IF NOT EXISTS FOR (lp:LearningPath) REQUIRE lp.id IS UNIQUE"
    );
    await session.run(
      "CREATE INDEX learningpath_id IF NOT EXISTS FOR (lp:LearningPath) ON (lp.id)"
    );
    await session.run(
      "CREATE INDEX learningpath_status IF NOT EXISTS FOR (lp:LearningPath) ON (lp.status)"
    );
    await session.run(
      "CREATE INDEX learningpath_difficultyLevel IF NOT EXISTS FOR (lp:LearningPath) ON (lp.difficultyLevel)"
    );

    // Create indexes for LearningPathStep nodes
    await session.run(
      "CREATE CONSTRAINT learningstep_id_unique IF NOT EXISTS FOR (s:LearningPathStep) REQUIRE s.id IS UNIQUE"
    );
    await session.run(
      "CREATE INDEX learningstep_id IF NOT EXISTS FOR (s:LearningPathStep) ON (s.id)"
    );
    await session.run(
      "CREATE INDEX learningstep_stepNumber IF NOT EXISTS FOR (s:LearningPathStep) ON (s.stepNumber)"
    );

    console.log("✅ Created indexes and constraints for Learning Path nodes");

    // Clear existing data
    await session.run("MATCH (n) DETACH DELETE n");

    // Define OLM001 hierarchy
    const olm001 = {
      conceptId: uuidv4(),
      name: "Ordinary Level Mathematics (OLM001)",
      type: "Subject",
      description: "Core mathematics curriculum for ordinary level",
      matters: [
        {
          conceptId: uuidv4(),
          name: "Numbers (MAT001)",
          type: "Matter",
          description: "Fundamental concepts of numbers",
          molecules: [
            {
              conceptId: uuidv4(),
              name: "Fractions (MOL001)",
              type: "Molecule",
              description: "Operations and properties of fractions",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Multiplication of Fractions (ATM001)",
                  type: "Atom",
                  description: "Multiplying fractions",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "fraction-multiplication (PAR001)",
                      type: "Particle",
                      description: "Rules for multiplying fractions",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "of-means-multiply (PAR002)",
                      type: "Particle",
                      description: "Interpreting 'of' as multiplication",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Division of Fractions (ATM002)",
                  type: "Atom",
                  description: "Dividing fractions",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "fraction-division (PAR003)",
                      type: "Particle",
                      description: "Rules for dividing fractions",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "reciprocal (PAR004)",
                      type: "Particle",
                      description: "Using reciprocals in fraction division",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Comparing Fractions (ATM003)",
                  type: "Atom",
                  description: "Comparing and ordering fractions",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "comparing-fractions (PAR005)",
                      type: "Particle",
                      description: "Methods for comparing fractions",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Simplifying Fractions (ATM004)",
                  type: "Atom",
                  description: "Reducing fractions to simplest form",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "reduce-fraction (PAR006)",
                      type: "Particle",
                      description: "Techniques for simplifying fractions",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Fraction Conversions (ATM005)",
                  type: "Atom",
                  description: "Converting fractions to decimals and percents",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "equivalent-fractions-decimals-percents (PAR007)",
                      type: "Particle",
                      description: "Converting between fractions, decimals, and percents",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "fraction-decimals-percents (PAR008)",
                      type: "Particle",
                      description: "Relationships between fractions, decimals, and percents",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "General Fractions (ATM006)",
                  type: "Atom",
                  description: "General properties of fractions",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "fractions (PAR009)",
                      type: "Particle",
                      description: "Fundamental fraction concepts",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Percentages (MOL002)",
              type: "Molecule",
              description: "Understanding and calculating percentages",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Calculating Percentages (ATM007)",
                  type: "Atom",
                  description: "Methods for calculating percentages",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "finding-percents (PAR010)",
                      type: "Particle",
                      description: "Calculating a percentage of a number",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "percent-of (PAR011)",
                      type: "Particle",
                      description: "Interpreting percent of a quantity",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "application: finding percentage of a number (PAR012)",
                      type: "Particle",
                      description: "Practical applications of percentages",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "percents (PAR013)",
                      type: "Particle",
                      description: "General percentage concepts",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Discounts (ATM008)",
                  type: "Atom",
                  description: "Calculating discounts using percentages",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "discount (PAR014)",
                      type: "Particle",
                      description: "Applying discounts in calculations",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Decimals (MOL003)",
              type: "Molecule",
              description: "Operations with decimals",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Multiplying Decimals (ATM009)",
                  type: "Atom",
                  description: "Multiplying decimal numbers",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "multiplying-decimals (PAR015)",
                      type: "Particle",
                      description: "Rules for multiplying decimals",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Adding and Subtracting Decimals (ATM010)",
                  type: "Atom",
                  description: "Adding and subtracting decimal numbers",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "adding-decimals (PAR016)",
                      type: "Particle",
                      description: "Rules for adding decimals",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "subtracting-decimals (PAR017)",
                      type: "Particle",
                      description: "Rules for subtracting decimals",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Dividing Decimals (ATM011)",
                  type: "Atom",
                  description: "Dividing decimal numbers",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "divide-decimals (PAR018)",
                      type: "Particle",
                      description: "Rules for dividing decimals",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Whole Numbers (MOL004)",
              type: "Molecule",
              description: "Operations with whole numbers",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Basic Operations (ATM012)",
                  type: "Atom",
                  description: "Fundamental operations with whole numbers",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "addition (PAR019)",
                      type: "Particle",
                      description: "Adding whole numbers",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "application: multi-column addition (PAR020)",
                      type: "Particle",
                      description: "Multi-column addition techniques",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "subtraction (PAR021)",
                      type: "Particle",
                      description: "Subtracting whole numbers",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "application: multi-column subtraction (PAR022)",
                      type: "Particle",
                      description: "Multi-column subtraction techniques",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "multiplication (PAR023)",
                      type: "Particle",
                      description: "Multiplying whole numbers",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "application: simple multiplication (PAR024)",
                      type: "Particle",
                      description: "Simple multiplication applications",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "division (PAR025)",
                      type: "Particle",
                      description: "Dividing whole numbers",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Order of Operations (ATM013)",
                  type: "Atom",
                  description: "Applying order of operations",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "order-of-operations (PAR026)",
                      type: "Particle",
                      description: "Rules for order of operations",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "application: order of operations (PAR027)",
                      type: "Particle",
                      description: "Practical applications of order of operations",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Indices (MOL005)",
              type: "Molecule",
              description: "Understanding indices and exponents",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Exponents (ATM014)",
                  type: "Atom",
                  description: "Properties and operations with exponents",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "exponents (PAR028)",
                      type: "Particle",
                      description: "Rules for working with exponents",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "scientific-notation (PAR029)",
                      type: "Particle",
                      description: "Using scientific notation",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Square Roots (ATM015)",
                  type: "Atom",
                  description: "Calculating and understanding square roots",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "square-root (PAR030)",
                      type: "Particle",
                      description: "Properties of square roots",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Number Patterns (MOL006)",
              type: "Molecule",
              description: "Identifying and analyzing number patterns",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Identifying Patterns (ATM016)",
                  type: "Atom",
                  description: "Techniques for finding number patterns",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "pattern-finding (PAR031)",
                      type: "Particle",
                      description: "Methods for identifying number patterns",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "p-patterns-relations-algebra (PAR032)",
                      type: "Particle",
                      description: "Patterns and their relation to algebra",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Integers (MOL007)",
              type: "Molecule",
              description: "Operations with integers",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Operations with Integers (ATM017)",
                  type: "Atom",
                  description: "Performing operations with integers",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "integers (PAR033)",
                      type: "Particle",
                      description: "Properties of integers",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "multiplying-positive-negative-numbers (PAR034)",
                      type: "Particle",
                      description: "Rules for multiplying positive and negative numbers",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Real Numbers (MOL008)",
              type: "Molecule",
              description: "Understanding real numbers",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Number Line Operations (ATM018)",
                  type: "Atom",
                  description: "Operations using the number line",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "number-line (PAR035)",
                      type: "Particle",
                      description: "Using the number line for operations",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "interpreting-numberline (PAR036)",
                      type: "Particle",
                      description: "Interpreting numbers on the number line",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "ordering-numbers (PAR037)",
                      type: "Particle",
                      description: "Ordering numbers on the number line",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Ratio and Proportion (MOL009)",
              type: "Molecule",
              description: "Understanding ratios and proportions",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Proportions (ATM019)",
                  type: "Atom",
                  description: "Working with proportions",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "proportion (PAR038)",
                      type: "Particle",
                      description: "Concepts of proportions",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Divisibility (ATM020)",
                  type: "Atom",
                  description: "Rules and properties of divisibility",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "divisibility (PAR039)",
                      type: "Particle",
                      description: "Rules for divisibility",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "prime-number (PAR040)",
                      type: "Particle",
                      description: "Understanding prime numbers",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "least-common-multiple (PAR041)",
                      type: "Particle",
                      description: "Finding the least common multiple",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Number Sense (MOL010)",
              type: "Molecule",
              description: "Developing number sense",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Rounding (ATM021)",
                  type: "Atom",
                  description: "Techniques for rounding numbers",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "rounding (PAR042)",
                      type: "Particle",
                      description: "Rules for rounding numbers",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Simple Calculations (ATM022)",
                  type: "Atom",
                  description: "Performing simple calculations",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "simple-calculation (PAR043)",
                      type: "Particle",
                      description: "Basic calculation techniques",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          conceptId: uuidv4(),
          name: "Measurements (MAT002)",
          type: "Matter",
          description: "Concepts of measurement",
          molecules: [
            {
              conceptId: uuidv4(),
              name: "Area of Plane Figures (MOL011)",
              type: "Molecule",
              description: "Calculating areas of plane figures",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Area Calculations (ATM023)",
                  type: "Atom",
                  description: "Methods for calculating areas",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "area (PAR044)",
                      type: "Particle",
                      description: "General area calculations",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "area-concept (PAR045)",
                      type: "Particle",
                      description: "Understanding the concept of area",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "area-of-circle (PAR046)",
                      type: "Particle",
                      description: "Calculating the area of a circle",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "meaning-of-pi (PAR047)",
                      type: "Particle",
                      description: "Understanding the constant pi",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Perimeter (MOL012)",
              type: "Molecule",
              description: "Calculating perimeters and circumferences",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Perimeter and Circumference (ATM024)",
                  type: "Atom",
                  description: "Methods for calculating perimeters and circumferences",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "perimeter (PAR048)",
                      type: "Particle",
                      description: "Calculating perimeters of shapes",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "circumference (PAR049)",
                      type: "Particle",
                      description: "Calculating circumferences of circles",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "meaning-of-pi (PAR050)",
                      type: "Particle",
                      description: "Understanding the constant pi",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Rate (MOL013)",
              type: "Molecule",
              description: "Understanding and calculating rates",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Rate Calculations (ATM025)",
                  type: "Atom",
                  description: "Methods for calculating rates",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "rate (PAR051)",
                      type: "Particle",
                      description: "General rate calculations",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "rate-with-distance-and-time (PAR052)",
                      type: "Particle",
                      description: "Calculating rates involving distance and time",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Unit Conversion (MOL014)",
              type: "Molecule",
              description: "Converting between units",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Converting Units (ATM026)",
                  type: "Atom",
                  description: "Techniques for unit conversion",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "unit-conversion (PAR053)",
                      type: "Particle",
                      description: "General unit conversion techniques",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "linear-area-volume-conversion (PAR054)",
                      type: "Particle",
                      description: "Converting linear, area, and volume units",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          conceptId: uuidv4(),
          name: "Algebra (MAT003)",
          type: "Matter",
          description: "Fundamental concepts of algebra",
          molecules: [
            {
              conceptId: uuidv4(),
              name: "Linear Equations (MOL015)",
              type: "Molecule",
              description: "Solving linear equations and inequalities",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Solving Equations (ATM027)",
                  type: "Atom",
                  description: "Techniques for solving linear equations",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "equation-solving (PAR055)",
                      type: "Particle",
                      description: "Methods for solving equations",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "interpreting-linear-equations (PAR056)",
                      type: "Particle",
                      description: "Interpreting linear equations",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "equation-concept (PAR057)",
                      type: "Particle",
                      description: "Understanding the concept of equations",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Solving Inequalities (ATM028)",
                  type: "Atom",
                  description: "Techniques for solving inequalities",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "inequality-solving (PAR058)",
                      type: "Particle",
                      description: "Methods for solving inequalities",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "inequalities (PAR059)",
                      type: "Particle",
                      description: "Properties of inequalities",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Algebraic Expressions (MOL016)",
              type: "Molecule",
              description: "Manipulating and evaluating algebraic expressions",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Manipulating Expressions (ATM029)",
                  type: "Atom",
                  description: "Techniques for manipulating algebraic expressions",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "algebraic-manipulation (PAR060)",
                      type: "Particle",
                      description: "Methods for manipulating expressions",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "symbolization-articulation (PAR061)",
                      type: "Particle",
                      description: "Symbolizing and articulating expressions",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "algebra symbolization (PAR062)",
                      type: "Particle",
                      description: "Symbolization in algebra",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "application: compare expressions (PAR063)",
                      type: "Particle",
                      description: "Comparing algebraic expressions",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "making-sense-of-expressions-and-equations (PAR064)",
                      type: "Particle",
                      description: "Understanding expressions and equations",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Substitution in Expressions (ATM030)",
                  type: "Atom",
                  description: "Substituting values in expressions",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "substitution (PAR065)",
                      type: "Particle",
                      description: "Techniques for substitution in expressions",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Graphs (MOL017)",
              type: "Molecule",
              description: "Plotting and interpreting graphs",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Graph Plotting and Interpretation (ATM031)",
                  type: "Atom",
                  description: "Techniques for plotting and interpreting graphs",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "point-plotting (PAR066)",
                      type: "Particle",
                      description: "Plotting points on a graph",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "reading-graph (PAR067)",
                      type: "Particle",
                      description: "Reading information from graphs",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "application: read points (PAR068)",
                      type: "Particle",
                      description: "Reading points from graphs",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "application: compare points (PAR069)",
                      type: "Particle",
                      description: "Comparing points on graphs",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "graph interpretation (PAR070)",
                      type: "Particle",
                      description: "Interpreting graph features",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "graph-shape (PAR071)",
                      type: "Particle",
                      description: "Understanding shapes of graphs",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Slope of Lines (ATM032)",
                  type: "Atom",
                  description: "Calculating and understanding slopes",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "slope (PAR072)",
                      type: "Particle",
                      description: "Calculating slopes of lines",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "application: find slope in graph (PAR073)",
                      type: "Particle",
                      description: "Finding slopes in graphs",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Functions (MOL018)",
              type: "Molecule",
              description: "Understanding and evaluating functions",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Evaluating Functions (ATM033)",
                  type: "Atom",
                  description: "Techniques for evaluating functions",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "evaluating-functions (PAR074)",
                      type: "Particle",
                      description: "Methods for evaluating functions",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "inducing-functions (PAR075)",
                      type: "Particle",
                      description: "Understanding function induction",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          conceptId: uuidv4(),
          name: "Geometry (MAT004)",
          type: "Matter",
          description: "Fundamental concepts of geometry",
          molecules: [
            {
              conceptId: uuidv4(),
              name: "Geometric Shapes and Solids (MOL019)",
              type: "Molecule",
              description: "Properties of shapes and solids",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Properties of Shapes (ATM034)",
                  type: "Atom",
                  description: "Understanding properties of geometric shapes",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "properties-of-geometric-figures (PAR076)",
                      type: "Particle",
                      description: "Properties of 2D geometric figures",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "properties-of-solids (PAR077)",
                      type: "Particle",
                      description: "Properties of 3D geometric solids",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Surface Area and Volume (ATM035)",
                  type: "Atom",
                  description: "Calculating surface area and volume",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "surface-area-and-volume (PAR078)",
                      type: "Particle",
                      description: "Methods for calculating surface area and volume",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Triangle Theorems (MOL020)",
              type: "Molecule",
              description: "Theorems related to triangles",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Sum of Interior Angles (ATM036)",
                  type: "Atom",
                  description: "Sum of interior angles in polygons",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "sum-of-interior-angles-triangle (PAR079)",
                      type: "Particle",
                      description: "Sum of interior angles in triangles",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "sum-of-interior-angles-more-than-3-sides (PAR080)",
                      type: "Particle",
                      description: "Sum of interior angles in polygons with more than 3 sides",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Isosceles Triangle Properties (ATM037)",
                  type: "Atom",
                  description: "Properties of isosceles triangles",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "isosceles-triangle (PAR081)",
                      type: "Particle",
                      description: "Properties of isosceles triangles",
                    },
                    {
                      conceptId: uuidv4(),
                      name: "application: isosceles triangle (PAR082)",
                      type: "Particle",
                      description: "Applications of isosceles triangle properties",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Triangle Inequality (ATM038)",
                  type: "Atom",
                  description: "Triangle inequality theorem",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "triangle-inequality (PAR083)",
                      type: "Particle",
                      description: "Understanding triangle inequality",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Pythagoras’ Theorem (MOL021)",
              type: "Molecule",
              description: "Applying Pythagoras’ theorem",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Applying Pythagoras’ Theorem (ATM039)",
                  type: "Atom",
                  description: "Using Pythagoras’ theorem in calculations",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "pythagorean-theorem (PAR084)",
                      type: "Particle",
                      description: "Understanding and applying Pythagoras’ theorem",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Angles and Parallel Lines (MOL022)",
              type: "Molecule",
              description: "Properties of angles and parallel lines",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Supplementary Angles (ATM040)",
                  type: "Atom",
                  description: "Understanding supplementary angles",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "supplementary-angles (PAR085)",
                      type: "Particle",
                      description: "Properties of supplementary angles",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Transversals (ATM041)",
                  type: "Atom",
                  description: "Properties of transversals",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "transversals (PAR086)",
                      type: "Particle",
                      description: "Understanding transversals and their angles",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Congruence and Similarity (MOL023)",
              type: "Molecule",
              description: "Understanding congruence and similarity",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Congruence (ATM042)",
                  type: "Atom",
                  description: "Properties of congruent shapes",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "congruence (PAR087)",
                      type: "Particle",
                      description: "Understanding congruence in shapes",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Similar Triangles (ATM043)",
                  type: "Atom",
                  description: "Properties of similar triangles",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "similar-triangles (PAR088)",
                      type: "Particle",
                      description: "Understanding similarity in triangles",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          conceptId: uuidv4(),
          name: "Sets and Probability (MAT005)",
          type: "Matter",
          description: "Concepts of sets and probability",
          molecules: [
            {
              conceptId: uuidv4(),
              name: "Sets (MOL025)",
              type: "Molecule",
              description: "Understanding sets and their representations",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Venn Diagrams (ATM045)",
                  type: "Atom",
                  description: "Using Venn diagrams to represent sets",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "venn-diagram (PAR090)",
                      type: "Particle",
                      description: "Understanding and creating Venn diagrams",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Probability (MOL026)",
              type: "Molecule",
              description: "Calculating probabilities",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Probability Calculations (ATM046)",
                  type: "Atom",
                  description: "Methods for calculating probabilities",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "probability (PAR091)",
                      type: "Particle",
                      description: "Basic probability concepts",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Combinatorics (ATM047)",
                  type: "Atom",
                  description: "Counting techniques in probability",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "combinatorics (PAR092)",
                      type: "Particle",
                      description: "Understanding combinatorics",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          conceptId: uuidv4(),
          name: "Statistics (MAT006)",
          type: "Matter",
          description: "Fundamental concepts of statistics",
          molecules: [
            {
              conceptId: uuidv4(),
              name: "Measures of Central Tendency (MOL027)",
              type: "Molecule",
              description: "Calculating measures of central tendency",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Mean (ATM048)",
                  type: "Atom",
                  description: "Calculating the mean",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "mean (PAR093)",
                      type: "Particle",
                      description: "Understanding and calculating the mean",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Median (ATM049)",
                  type: "Atom",
                  description: "Calculating the median",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "median (PAR094)",
                      type: "Particle",
                      description: "Understanding and calculating the median",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Mode (ATM050)",
                  type: "Atom",
                  description: "Calculating the mode",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "mode (PAR095)",
                      type: "Particle",
                      description: "Understanding and calculating the mode",
                    },
                  ],
                },
              ],
            },
            {
              conceptId: uuidv4(),
              name: "Data Representation (MOL028)",
              type: "Molecule",
              description: "Representing data visually",
              atoms: [
                {
                  conceptId: uuidv4(),
                  name: "Circle Graphs (ATM051)",
                  type: "Atom",
                  description: "Creating and interpreting circle graphs",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "circle-graph (PAR096)",
                      type: "Particle",
                      description: "Understanding circle graphs",
                    },
                  ],
                },
                {
                  conceptId: uuidv4(),
                  name: "Stem and Leaf Plots (ATM052)",
                  type: "Atom",
                  description: "Creating and interpreting stem and leaf plots",
                  particles: [
                    {
                      conceptId: uuidv4(),
                      name: "stem-and-leaf-plot (PAR097)",
                      type: "Particle",
                      description: "Understanding stem and leaf plots",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    // Create root OLM001 node
    await session.run(
      "CREATE (c:SyllabusConcept {conceptId: $conceptId, name: $name, type: $type, description: $description, createdAt: $createdAt}) RETURN c",
      {
        conceptId: olm001.conceptId,
        name: olm001.name,
        type: olm001.type,
        description: olm001.description,
        createdAt: currentTime,
      }
    );

    // Recursive function to create hierarchy
    const createHierarchy = async (
      parentId,
      items,
      nodeType,
      relType = "CONTAINS"
    ) => {
      for (const item of items) {
        const nodeId = item.conceptId;
        const nodeName = item.name;
        const nodeTypeValue = item.type;
        const nodeDescription = item.description;

        // Create node
        await session.run(
          `CREATE (c:SyllabusConcept {conceptId: $conceptId, name: $name, type: $type, description: $description, createdAt: $createdAt}) RETURN c`,
          {
            conceptId: nodeId,
            name: nodeName,
            type: nodeTypeValue,
            description: nodeDescription,
            createdAt: currentTime,
          }
        );

        // Create relationship to parent
        await session.run(
          `MATCH (p:SyllabusConcept {conceptId: $parentId})
           MATCH (c:SyllabusConcept {conceptId: $childId})
           CREATE (p)-[:${relType}]->(c)`,
          { parentId, childId: nodeId }
        );

        // Recurse for sub-levels
        if (item.molecules) {
          await createHierarchy(nodeId, item.molecules, "Molecule");
        } else if (item.atoms) {
          await createHierarchy(nodeId, item.atoms, "Atom");
        } else if (item.particles) {
          await createHierarchy(nodeId, item.particles, "Particle");
        }
      }
    };

    // Create matters under OLM001
    await createHierarchy(olm001.conceptId, olm001.matters, "Matter");

    // Create some prerequisite relationships between particles
    // Basic prerequisites - more fundamental concepts should be prerequisites for advanced ones
    const prerequisites = [
      // Fractions prerequisites
      { concept: "PAR001", prerequisite: "PAR009" }, // multiplication needs general fraction understanding
      { concept: "PAR003", prerequisite: "PAR001" }, // division needs multiplication
      { concept: "PAR003", prerequisite: "PAR004" }, // division needs reciprocal understanding
      { concept: "PAR005", prerequisite: "PAR009" }, // comparing needs general fractions
      { concept: "PAR007", prerequisite: "PAR009" }, // conversions need general fractions
      { concept: "PAR008", prerequisite: "PAR007" }, // advanced conversions need basic conversions
      
      // Decimals prerequisites
      { concept: "PAR015", prerequisite: "PAR016" }, // multiplying needs adding
      { concept: "PAR018", prerequisite: "PAR015" }, // dividing needs multiplying
      
      // Percentages prerequisites
      { concept: "PAR010", prerequisite: "PAR007" }, // percentages need fraction-decimal conversion
      { concept: "PAR011", prerequisite: "PAR010" }, // percent of needs basic percentage
      { concept: "PAR012", prerequisite: "PAR011" }, // applications need percent of
      { concept: "PAR014", prerequisite: "PAR010" }, // discounts need basic percentages
    ];

    for (const prereq of prerequisites) {
      await session.run(
        `MATCH (c:SyllabusConcept {conceptId: $conceptId})
         MATCH (p:SyllabusConcept {conceptId: $prerequisiteId})
         CREATE (c)-[:HAS_PREREQUISITE]->(p)`,
        { conceptId: prereq.concept, prerequisiteId: prereq.prerequisite }
      );
    }

    // Define grade-specific data with resources
    const grades = [
      {
        name: "Grade6",
        conceptId: uuidv4(),
        type: "Grade",
        description: "Mathematics curriculum for Grade 6",
        topics: [
          {
            name: "Rectilinear Plane Figures",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Study of rectilinear plane figures",
            linkedConcepts: ["PAR076", "PAR078"],
            resource: {
              title: "Rectilinear Plane Figures Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Rectilinear Plane Figures.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: "Rectilinear Plane Figures",
          },
          {
            name: "Decimals",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Operations with decimals",
            linkedConcepts: ["PAR016", "PAR017", "PAR005", "PAR007", "PAR008"],
            resource: {
              title: "Decimals Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Decimals.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: "Decimals",
          },
          {
            name: "Types of Numbers and Number Patterns",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Exploring types of numbers and patterns",
            linkedConcepts: ["PAR039", "PAR040", "PAR030", "PAR031", "PAR032"],
            resource: {
              title: "Number Patterns Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Types of Numbers and Number Patterns.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: null,
          },
          {
            name: "Length",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Measuring and calculating length",
            linkedConcepts: ["PAR053", "PAR054", "PAR048"],
            resource: {
              title: "Length Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Length.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: "Length",
          },
          {
            name: "Liquid Measurements",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Measuring liquid volumes",
            linkedConcepts: ["PAR053", "PAR054", "PAR016", "PAR017"],
            resource: {
              title: "Liquid Measurements Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Liquid Measurements.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: "Liquid Measurements",
          },
          {
            name: "Solids",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Properties of solid shapes",
            linkedConcepts: ["PAR077", "PAR078"],
            resource: {
              title: "Solids Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Solids.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: "Solids",
          },
          {
            name: "Algebraic Symbols",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Introduction to algebraic symbols",
            linkedConcepts: ["PAR061", "PAR062"],
            resource: {
              title: "Algebraic Symbols Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Algebraic Symbols.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: null,
          },
          {
            name: "Constructing Algebraic Expressions and Substitution",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Building and evaluating algebraic expressions",
            linkedConcepts: ["PAR060", "PAR064", "PAR065"],
            resource: {
              title: "Algebraic Expressions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Constructing Algebraic Expressions and Substitution.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: null,
          },
          {
            name: "Mass",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Measuring mass",
            linkedConcepts: ["PAR053", "PAR054", "PAR016", "PAR017"],
            resource: {
              title: "Mass Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Mass.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: "Mass",
          },
          {
            name: "Ratio",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding ratios",
            linkedConcepts: ["PAR038", "PAR051", "PAR052"],
            resource: {
              title: "Ratio Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Ratio.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: "Ratios",
          },
          {
            name: "Data Collection and Representation",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Collecting and representing data",
            linkedConcepts: ["PAR096", "PAR097"],
            resource: {
              title: "Data Collection Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Data Collection and Representation.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: null,
          },
          {
            name: "Data Interpretation",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Interpreting data representations",
            linkedConcepts: ["PAR096", "PAR093"],
            resource: {
              title: "Data Interpretation Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Data Interpretation.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: null,
          },
          {
            name: "Indices",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding indices",
            linkedConcepts: ["PAR028"],
            resource: {
              title: "Indices Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Indices.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: "Indices",
          },
          {
            name: "Area",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating area of shapes",
            linkedConcepts: ["PAR044", "PAR045"],
            resource: {
              title: "Area Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 6/grade-6-Area.pdf",
              price: 0,
              grade: "Grade6",
            },
            sameConcept: "Area",
          },
        ],
      },
      {
        name: "Grade7",
        conceptId: uuidv4(),
        type: "Grade",
        description: "Mathematics curriculum for Grade 7",
        topics: [
          {
            name: "Bilateral Symmetry",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding bilateral symmetry",
            linkedConcepts: ["PAR076"],
            resource: {
              title: "Bilateral Symmetry Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Bilateral Symmetry.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Sets",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Introduction to set theory",
            linkedConcepts: ["PAR090"],
            resource: {
              title: "Sets Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Sets.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Sets",
          },
          {
            name: "Mathematical Operations on Whole Numbers",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Operations with whole numbers",
            linkedConcepts: ["PAR019", "PAR021", "PAR023", "PAR025"],
            resource: {
              title: "Whole Numbers Operations Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Mathematical Operations on Whole Numbers.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Factors and Multiples",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding factors and multiples",
            linkedConcepts: ["PAR039", "PAR040"],
            resource: {
              title: "Factors and Multiples Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Factors and Multiples.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Indices",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with indices",
            linkedConcepts: ["PAR028", "PAR030"],
            resource: {
              title: "Indices Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Indices.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Indices",
          },
          {
            name: "Time",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Measuring and calculating time",
            linkedConcepts: ["PAR053", "PAR051", "PAR052"],
            resource: {
              title: "Time Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Time.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Parallel Straight Lines",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Properties of parallel lines",
            linkedConcepts: ["PAR086"],
            resource: {
              title: "Parallel Lines Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Parallel Straight Lines.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Directed Numbers",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Operations with directed numbers",
            linkedConcepts: ["PAR033", "PAR034"],
            resource: {
              title: "Directed Numbers Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Directed Numbers.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Angles",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Properties and calculations of angles",
            linkedConcepts: ["PAR071", "PAR072"],
            resource: {
              title: "Angles Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Angles.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Fractions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Comprehensive study of fractions",
            linkedConcepts: [
              "PAR001",
              "PAR002",
              "PAR003",
              "PAR004",
              "PAR005",
              "PAR006",
              "PAR007",
              "PAR008",
            ],
            resource: {
              title: "Fractions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Fractions.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Fractions",
          },
          {
            name: "Decimals",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Operations with decimals",
            linkedConcepts: ["PAR016", "PAR017", "PAR005", "PAR007", "PAR008"],
            resource: {
              title: "Decimals Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Decimals.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Decimals",
          },
          {
            name: "Algebraic Expressions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with algebraic expressions",
            linkedConcepts: ["PAR060", "PAR061", "PAR062", "PAR064", "PAR065"],
            resource: {
              title: "Algebraic Expressions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Algebraic Expressions.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Algebraic Expressions",
          },
          {
            name: "Mass",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Measuring mass",
            linkedConcepts: ["PAR053", "PAR054", "PAR016", "PAR017"],
            resource: {
              title: "Mass Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Mass.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Mass",
          },
          {
            name: "Rectilinear Plane Figures",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Study of rectilinear plane figures",
            linkedConcepts: ["PAR076", "PAR078"],
            resources: [
              {
                title: "Rectilinear Plane Figures Notes 1",
                type: "Notes",
                url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Rectilinear Plane Figures 1.pdf",
                price: 0,
                grade: "Grade7",
              },
              {
                title: "Rectilinear Plane Figures Notes 2",
                type: "Notes",
                url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Rectilinear Plane Figures 2.pdf",
                price: 0,
                grade: "Grade7",
              },
            ],
            sameConcept: "Rectilinear Plane Figures",
          },
          {
            name: "Equations and Formulae",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Solving equations and using formulae",
            linkedConcepts: ["PAR058", "PAR059"],
            resource: {
              title: "Equations and Formulae Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Equations and Formulae.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Formulae",
          },
          {
            name: "Length",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Measuring and calculating length",
            linkedConcepts: ["PAR053", "PAR054", "PAR048"],
            resource: {
              title: "Length Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Length.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Length",
          },
          {
            name: "Area",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating area of shapes",
            linkedConcepts: ["PAR044", "PAR045"],
            resource: {
              title: "Area Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Area.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Area",
          },
          {
            name: "Circles",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Properties of circles",
            linkedConcepts: ["PAR048", "PAR044", "PAR045"],
            resource: {
              title: "Circles Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Circles.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Volume",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating volume of shapes",
            linkedConcepts: ["PAR078"],
            resource: {
              title: "Volume Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Volume.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Liquid Measurements",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Measuring liquid volumes",
            linkedConcepts: ["PAR053", "PAR054", "PAR016", "PAR017"],
            resource: {
              title: "Liquid Measurements Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Liquid Measurements.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Liquid Measurements",
          },
          {
            name: "Ratios",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding ratios",
            linkedConcepts: ["PAR038", "PAR051", "PAR052"],
            resource: {
              title: "Ratios Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Ratios.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Ratios",
          },
          {
            name: "Percentages",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating and applying percentages",
            linkedConcepts: ["PAR009", "PAR007", "PAR008"],
            resource: {
              title: "Percentages Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Percentages.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Percentages",
          },
          {
            name: "Cartesian Plane",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Introduction to the Cartesian plane",
            linkedConcepts: ["PAR066", "PAR067"],
            resource: {
              title: "Cartesian Plane Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Cartesian Plane.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Construction of Plane Figures",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Constructing plane figures",
            linkedConcepts: ["PAR076"],
            resource: {
              title: "Plane Figures Construction Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Construction of Plane Figures.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Solids",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Properties of solid shapes",
            linkedConcepts: ["PAR077", "PAR078"],
            resource: {
              title: "Solids Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Solids.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Solids",
          },
          {
            name: "Data Representation and Interpretation",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Representing and interpreting data",
            linkedConcepts: ["PAR096", "PAR097", "PAR093", "PAR094", "PAR095"],
            resource: {
              title: "Data Representation Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Data Representation and Interpretation.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Data Representation and Interpretation",
          },
          {
            name: "Tessellation",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding tessellations",
            linkedConcepts: ["PAR076"],
            resource: {
              title: "Tessellation Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Tessellation.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
          {
            name: "Scale Diagrams",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with scale diagrams",
            linkedConcepts: ["PAR038"],
            resource: {
              title: "Scale Diagrams Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Scale Diagrams.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: "Scale Diagrams",
          },
          {
            name: "Likelihood of an Event",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Introduction to probability",
            linkedConcepts: ["PAR091", "PAR092"],
            resource: {
              title: "Probability Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 7/grade-7-Likelihood of an Event.pdf",
              price: 0,
              grade: "Grade7",
            },
            sameConcept: null,
          },
        ],
      },
      {
        name: "Grade8",
        conceptId: uuidv4(),
        type: "Grade",
        description: "Mathematics curriculum for Grade 8",
        topics: [
          {
            name: "Algebraic Expressions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with algebraic expressions",
            linkedConcepts: ["PAR060", "PAR061", "PAR062", "PAR064", "PAR065"],
            resource: {
              title: "Algebraic Expressions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Algebraic-Expressions.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Algebraic Expressions",
          },
          {
            name: "Angles",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Properties and calculations of angles",
            linkedConcepts: ["PAR071", "PAR072"],
            resource: {
              title: "Angles Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Angles.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Area",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating area of shapes",
            linkedConcepts: ["PAR044", "PAR045"],
            resource: {
              title: "Area Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Area.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Area",
          },
          {
            name: "Circle",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Properties of circles",
            linkedConcepts: ["PAR048", "PAR049", "PAR050"],
            resource: {
              title: "Circle Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Circle.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Data Representation and Interpretation",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Representing and interpreting data",
            linkedConcepts: ["PAR096", "PAR097", "PAR093", "PAR094", "PAR095"],
            resource: {
              title: "Data Representation Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Data-Representation-and-Interpretation.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Data Representation and Interpretation",
          },
          {
            name: "Decimals",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Operations with decimals",
            linkedConcepts: ["PAR015", "PAR016", "PAR017", "PAR018"],
            resource: {
              title: "Decimals Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Decimals.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Decimals",
          },
          {
            name: "Directed Numbers",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Operations with directed numbers",
            linkedConcepts: ["PAR033", "PAR034"],
            resource: {
              title: "Directed Numbers Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Directed-Numbers.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Equations",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Solving equations",
            linkedConcepts: ["PAR055", "PAR056", "PAR057"],
            resource: {
              title: "Equations Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Equations.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Equations",
          },
          {
            name: "Factors",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding factors",
            linkedConcepts: ["PAR039", "PAR040", "PAR041"],
            resource: {
              title: "Factors Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Factors.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Fractions-I",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Fundamentals of fractions",
            linkedConcepts: [
              "PAR001",
              "PAR002",
              "PAR003",
              "PAR004",
              "PAR005",
              "PAR006",
              "PAR007",
              "PAR008",
              "PAR009",
            ],
            resource: {
              title: "Fractions I Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Fractions-I.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Fractions",
          },
          {
            name: "Fractions-II",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Advanced fraction concepts",
            linkedConcepts: [
              "PAR001",
              "PAR002",
              "PAR003",
              "PAR004",
              "PAR005",
              "PAR006",
              "PAR007",
              "PAR008",
              "PAR009",
            ],
            resource: {
              title: "Fractions II Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Fractions-II.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Fractions",
          },
          {
            name: "Indices",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with indices",
            linkedConcepts: ["PAR028", "PAR029", "PAR030"],
            resource: {
              title: "Indices Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Indices.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Indices",
          },
          {
            name: "Location of a Place",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding coordinates",
            linkedConcepts: ["PAR066", "PAR067"],
            resource: {
              title: "Location of a Place Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Location-of-a-Place.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Mass",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Measuring mass",
            linkedConcepts: ["PAR053", "PAR054"],
            resource: {
              title: "Mass Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Mass.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Mass",
          },
          {
            name: "Number Line and Cartesian Plane",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with number lines and Cartesian planes",
            linkedConcepts: ["PAR035", "PAR036", "PAR037", "PAR066", "PAR067"],
            resource: {
              title: "Number Line and Cartesian Plane Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Number-Line-and-Cartesian-Plane.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Number Patterns",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Identifying number patterns",
            linkedConcepts: ["PAR031", "PAR032"],
            resource: {
              title: "Number Patterns Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Number-Patterns.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Percentages",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating and applying percentages",
            linkedConcepts: ["PAR010", "PAR011", "PAR012", "PAR013"],
            resource: {
              title: "Percentages Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Percentages.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Percentages",
          },
          {
            name: "Perimeter",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating perimeter of shapes",
            linkedConcepts: ["PAR048", "PAR049", "PAR050"],
            resource: {
              title: "Perimeter Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Perimeter.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Probability",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Introduction to probability",
            linkedConcepts: ["PAR091", "PAR092"],
            resource: {
              title: "Probability Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Probability.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Probability",
          },
          {
            name: "Ratios",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding ratios",
            linkedConcepts: ["PAR038", "PAR051", "PAR052"],
            resource: {
              title: "Ratios Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Ratios.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Ratios",
          },
          {
            name: "Scale Drawings",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with scale drawings",
            linkedConcepts: ["PAR038"],
            resource: {
              title: "Scale Drawings Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Scale-Drawings.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Scale Diagrams",
          },
          {
            name: "Sets",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with sets",
            linkedConcepts: ["PAR090"],
            resource: {
              title: "Sets Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Sets.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Sets",
          },
          {
            name: "Solids",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Properties of solid shapes",
            linkedConcepts: ["PAR077", "PAR078"],
            resource: {
              title: "Solids Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Solids.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Solids",
          },
          {
            name: "Square Root",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding square roots",
            linkedConcepts: ["PAR030"],
            resource: {
              title: "Square Root Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Square-Root.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Symmetry",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding symmetry",
            linkedConcepts: ["PAR076"],
            resource: {
              title: "Symmetry Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Symmetry.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Tessellation",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding tessellations",
            linkedConcepts: ["PAR076"],
            resource: {
              title: "Tessellation Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Tessellation.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Time",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Measuring and calculating time",
            linkedConcepts: ["PAR053"],
            resource: {
              title: "Time Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Time.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Triangle Constructions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Constructing triangles",
            linkedConcepts: ["PAR076"],
            resource: {
              title: "Triangle Constructions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Triangle-Constructions.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
          {
            name: "Triangles",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Properties of triangles",
            linkedConcepts: [
              "PAR079",
              "PAR080",
              "PAR081",
              "PAR082",
              "PAR083",
              "PAR088",
            ],
            resource: {
              title: "Triangles Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Triangles.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: "Triangles",
          },
          {
            name: "Volume and Capacity",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating volume and capacity",
            linkedConcepts: ["PAR078"],
            resource: {
              title: "Volume and Capacity Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 8/grade-8-mathematics-Volume-and-Capacity.pdf",
              price: 0,
              grade: "Grade8",
            },
            sameConcept: null,
          },
        ],
      },
      {
        name: "Grade9",
        conceptId: uuidv4(),
        type: "Grade",
        description: "Mathematics curriculum for Grade 9",
        topics: [
          {
            name: "Number Patterns",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Identifying number patterns",
            linkedConcepts: ["PAR031", "PAR032"],
            resource: {
              title: "Number Patterns Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-01-Number-Patterns.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: null,
          },
          {
            name: "Binary Numbers",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding binary numbers",
            linkedConcepts: ["PAR033"],
            resource: {
              title: "Binary Numbers Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-02-Binary-Numbers.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: null,
          },
          {
            name: "Fractions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Comprehensive study of fractions",
            linkedConcepts: [
              "PAR001",
              "PAR002",
              "PAR003",
              "PAR004",
              "PAR005",
              "PAR006",
              "PAR007",
              "PAR008",
              "PAR009",
            ],
            resource: {
              title: "Fractions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-03-Fractions.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Fractions",
          },
          {
            name: "Percentages",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating and applying percentages",
            linkedConcepts: ["PAR010", "PAR011", "PAR012", "PAR013"],
            resource: {
              title: "Percentages Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-04-Percentages.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Percentages",
          },
          {
            name: "Algebraic Expressions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with algebraic expressions",
            linkedConcepts: ["PAR060", "PAR061", "PAR062", "PAR064", "PAR065"],
            resource: {
              title: "Algebraic Expressions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-05-Algebraic-Expressions.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Algebraic Expressions",
          },
          {
            name: "Factors of the Algebraic Expressions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Factoring algebraic expressions",
            linkedConcepts: ["PAR039", "PAR040", "PAR041"],
            resource: {
              title: "Algebraic Expressions Factors Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-06-Factors-of-the-Algebraic-Expressions.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: null,
          },
          {
            name: "Axioms",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding mathematical axioms",
            linkedConcepts: ["PAR076"],
            resource: {
              title: "Axioms Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-07-Axioms.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: null,
          },
          {
            name: "Angles related to straight lines and parallel lines",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Angles with straight and parallel lines",
            linkedConcepts: ["PAR085", "PAR086"],
            resource: {
              title: "Angles with Lines Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-08-Angles-related-to-straight-lines-and-parallel-lines.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: null,
          },
          {
            name: "Liquid Measurements",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Measuring liquid volumes",
            linkedConcepts: ["PAR053", "PAR054"],
            resource: {
              title: "Liquid Measurements Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-09-Liquid-Measurements.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Liquid Measurements",
          },
          {
            name: "Direct Proportion",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding direct proportions",
            linkedConcepts: ["PAR038"],
            resource: {
              title: "Direct Proportion Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-10-Direct-Proportion.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: null,
          },
          {
            name: "Calculator",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Using calculators for computations",
            linkedConcepts: ["PAR043"],
            resource: {
              title: "Calculator Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-11-Calculator.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: null,
          },
          {
            name: "Indices",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with indices",
            linkedConcepts: ["PAR028", "PAR029", "PAR030"],
            resource: {
              title: "Indices Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-12-Indices.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Indices",
          },
          {
            name: "Round off and Scientific Notation",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Rounding and scientific notation",
            linkedConcepts: ["PAR029", "PAR042"],
            resource: {
              title: "Scientific Notation Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-13-Round-off-and-Scientific-Notation.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: null,
          },
          {
            name: "Loci and Constructions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Geometric loci and constructions",
            linkedConcepts: ["PAR076"],
            resource: {
              title: "Loci and Constructions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-14-Loci-and-Constructions.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: null,
          },
          {
            name: "Equations",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Solving equations",
            linkedConcepts: ["PAR055", "PAR056", "PAR057"],
            resource: {
              title: "Equations Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-15-Equations.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Equations",
          },
          {
            name: "Angles of a Triangle",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Properties of triangle angles",
            linkedConcepts: ["PAR079", "PAR080"],
            resource: {
              title: "Triangle Angles Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-16-Angles-of-a-Triangle.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: null,
          },
          {
            name: "Formulae",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Using mathematical formulae",
            linkedConcepts: ["PAR057"],
            resource: {
              title: "Formulae Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-17-Formulae.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Formulae",
          },
          {
            name: "Circumference of Circle",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating circle circumference",
            linkedConcepts: ["PAR049", "PAR050"],
            resource: {
              title: "Circle Circumference Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-18-Circumference-of-Circle.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: null,
          },
          {
            name: "Pythagoras Relation",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Applying the Pythagorean theorem",
            linkedConcepts: ["PAR084"],
            resource: {
              title: "Pythagoras Theorem Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-19-Pythagoras-Relation.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Pythagoras Theorem",
          },
          {
            name: "Inequalities",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with inequalities",
            linkedConcepts: ["PAR058", "PAR059"],
            resource: {
              title: "Inequalities Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-20-Inequalities.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Inequalities",
          },
          {
            name: "Sets",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with sets",
            linkedConcepts: ["PAR090"],
            resource: {
              title: "Sets Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-21-Sets.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Sets",
          },
          {
            name: "Area",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating area of shapes",
            linkedConcepts: ["PAR044", "PAR045", "PAR046", "PAR047"],
            resource: {
              title: "Area Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-22-Area.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Area",
          },
          {
            name: "Probability",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Introduction to probability",
            linkedConcepts: ["PAR091", "PAR092"],
            resource: {
              title: "Probability Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-23-Probability.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Probability",
          },
          {
            name: "Algebraic Fractions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with algebraic fractions",
            linkedConcepts: [
              "PAR001",
              "PAR002",
              "PAR003",
              "PAR004",
              "PAR005",
              "PAR006",
              "PAR007",
              "PAR008",
              "PAR009",
            ],
            resource: {
              title: "Algebraic Fractions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-24-Algebraic Fractions.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Algebraic Fractions",
          },
          {
            name: "Scale Diagrams",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with scale diagrams",
            linkedConcepts: ["PAR038"],
            resource: {
              title: "Scale Diagrams Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-25-Scale Diagrams.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Scale Diagrams",
          },
          {
            name: "Data Representation and Prediction",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Data representation and predictive analysis",
            linkedConcepts: ["PAR096", "PAR097", "PAR093", "PAR094", "PAR095"],
            resource: {
              title: "Data Representation Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 9/grade-9-mathematics-26-Data-Representation-and-Prediction.pdf",
              price: 0,
              grade: "Grade9",
            },
            sameConcept: "Data Representation and Interpretation",
          },
          {
            name: "Angles of Polygons",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating angles in polygons",
            linkedConcepts: ["PAR080"],
            resource: null,
            sameConcept: null,
          },
          {
            name: "Graphs",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with graphs",
            linkedConcepts: [
              "PAR066",
              "PAR067",
              "PAR068",
              "PAR069",
              "PAR070",
              "PAR071",
              "PAR072",
              "PAR073",
            ],
            resource: null,
            sameConcept: "Graphs",
          },
        ],
      },
      {
        name: "Grade10",
        conceptId: uuidv4(),
        type: "Grade",
        description: "Mathematics curriculum for Grade 10",
        topics: [
          {
            name: "Perimeter",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating perimeter of shapes",
            linkedConcepts: ["PAR048", "PAR049", "PAR050"],
            resource: {
              title: "Perimeter Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Perimeter.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: null,
          },
          {
            name: "Square Root",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding square roots",
            linkedConcepts: ["PAR030"],
            resource: {
              title: "Square Root Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Square-Root.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: null,
          },
          {
            name: "Fractions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Comprehensive study of fractions",
            linkedConcepts: [
              "PAR001",
              "PAR002",
              "PAR003",
              "PAR004",
              "PAR005",
              "PAR006",
              "PAR007",
              "PAR008",
              "PAR009",
            ],
            resource: {
              title: "Fractions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Fractions.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: "Fractions",
          },
          {
            name: "Binomial Expressions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with binomial expressions",
            linkedConcepts: ["PAR060"],
            resource: {
              title: "Binomial Expressions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Binomial-Expressions.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: "Binomial Expressions",
          },
          {
            name: "Congruence of Triangles",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding triangle congruence",
            linkedConcepts: ["PAR087"],
            resource: {
              title: "Triangle Congruence Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Congruence-of-Triangles.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: null,
          },
          {
            name: "Area",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Calculating area of shapes",
            linkedConcepts: ["PAR044", "PAR045", "PAR046", "PAR047"],
            resource: {
              title: "Area Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Area.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: "Area",
          },
          {
            name: "Factors of Quadratic Expressions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Factoring quadratic expressions",
            linkedConcepts: ["PAR039", "PAR040", "PAR041"],
            resource: {
              title: "Quadratic Expressions Factors Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Factors-of-Quadratic-Expressions.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: null,
          },
          {
            name: "Triangles I",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Properties of triangles",
            linkedConcepts: [
              "PAR079",
              "PAR080",
              "PAR081",
              "PAR082",
              "PAR083",
              "PAR088",
            ],
            resource: {
              title: "Triangles I Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Triangles-I.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: "Triangles",
          },
          {
            name: "Triangles II",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Advanced triangle properties",
            linkedConcepts: [
              "PAR079",
              "PAR080",
              "PAR081",
              "PAR082",
              "PAR083",
              "PAR088",
            ],
            resource: {
              title: "Triangles II Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Triangles-II.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: "Triangles",
          },
          {
            name: "Inverse Proportions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding inverse proportions",
            linkedConcepts: ["PAR038"],
            resource: {
              title: "Inverse Proportions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Inverse-Proportions.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: null,
          },
          {
            name: "Data Representation",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Representing data",
            linkedConcepts: ["PAR096", "PAR097", "PAR093", "PAR094", "PAR095"],
            resource: {
              title: "Data Representation Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Data-Representation.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: null,
          },
          {
            name: "Least Common Multiple of Algebraic Expressions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Finding LCM of algebraic expressions",
            linkedConcepts: ["PAR041"],
            resource: {
              title: "LCM of Algebraic Expressions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Least-Common-Multiple-of-Algebraic-Expressions.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: null,
          },
          {
            name: "Algebraic Fractions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with algebraic fractions",
            linkedConcepts: [
              "PAR001",
              "PAR002",
              "PAR003",
              "PAR004",
              "PAR005",
              "PAR006",
              "PAR007",
              "PAR008",
              "PAR009",
            ],
            resource: {
              title: "Algebraic Fractions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Algebraic-Fractions.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: "Algebraic Fractions",
          },
          {
            name: "Equations",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Solving equations",
            linkedConcepts: ["PAR055", "PAR056", "PAR057"],
            resource: {
              title: "Equations Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Equations.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: "Equations",
          },
          {
            name: "Indices",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with indices",
            linkedConcepts: ["PAR028", "PAR029", "PAR030"],
            resource: {
              title: "Indices Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Indices.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: "Indices",
          },
          {
            name: "Probability",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Introduction to probability",
            linkedConcepts: ["PAR091", "PAR092"],
            resource: {
              title: "Probability Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Probability.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: "Probability",
          },
          {
            name: "Pythagoras Theorem",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Applying the Pythagorean theorem",
            linkedConcepts: ["PAR084"],
            resource: {
              title: "Pythagoras Theorem Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Pythagoras-Theorem.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: "Pythagoras Theorem",
          },
          {
            name: "Sets",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with sets",
            linkedConcepts: ["PAR090"],
            resource: {
              title: "Sets Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 10/grade-10-mathematics-Sets.pdf",
              price: 0,
              grade: "Grade10",
            },
            sameConcept: "Sets",
          },
        ],
      },
      {
        name: "Grade11",
        conceptId: uuidv4(),
        type: "Grade",
        description: "Mathematics curriculum for Grade 11",
        topics: [
          {
            name: "Algebraic Expressions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with algebraic expressions",
            linkedConcepts: ["PAR060", "PAR061", "PAR062", "PAR064", "PAR065"],
            resource: {
              title: "Algebraic Expressions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Algebraic-Expressions.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: "Algebraic Expressions",
          },
          {
            name: "Equations",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Solving equations",
            linkedConcepts: ["PAR055", "PAR056", "PAR057"],
            resource: {
              title: "Equations Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Equations.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: "Equations",
          },
          {
            name: "Inequalities",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with inequalities",
            linkedConcepts: ["PAR058", "PAR059"],
            resource: {
              title: "Inequalities Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Inequalities.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: "Inequalities",
          },
          {
            name: "Indices",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with indices",
            linkedConcepts: ["PAR028", "PAR029", "PAR030"],
            resource: {
              title: "Indices Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Indices.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: "Indices",
          },
          {
            name: "Surds",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Operations with surds",
            linkedConcepts: ["PAR030"],
            resource: {
              title: "Surds Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Surds.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: null,
          },
          {
            name: "Functions",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Understanding functions",
            linkedConcepts: ["PAR066", "PAR067", "PAR068", "PAR069", "PAR070"],
            resource: {
              title: "Functions Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Functions.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: null,
          },
          {
            name: "Quadratic Equations",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Solving quadratic equations",
            linkedConcepts: ["PAR055", "PAR056", "PAR057"],
            resource: {
              title: "Quadratic Equations Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Quadratic-Equations.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: null,
          },
          {
            name: "Trigonometry",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Introduction to trigonometry",
            linkedConcepts: ["PAR081", "PAR082", "PAR083"],
            resource: {
              title: "Trigonometry Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Trigonometry.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: null,
          },
          {
            name: "Coordinate Geometry",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Working with coordinate geometry",
            linkedConcepts: ["PAR066", "PAR067", "PAR068"],
            resource: {
              title: "Coordinate Geometry Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Coordinate-Geometry.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: null,
          },
          {
            name: "Statistics",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Statistical analysis and representation",
            linkedConcepts: ["PAR093", "PAR094", "PAR095", "PAR096", "PAR097"],
            resource: {
              title: "Statistics Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Statistics.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: null,
          },
          {
            name: "Probability",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Advanced probability concepts",
            linkedConcepts: ["PAR091", "PAR092"],
            resource: {
              title: "Probability Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Probability.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: "Probability",
          },
          {
            name: "Sets",
            conceptId: uuidv4(),
            type: "Topic",
            description: "Advanced set theory",
            linkedConcepts: ["PAR090"],
            resource: {
              title: "Sets Notes",
              type: "Notes",
              url: "https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade 11/grade-11-mathematics-Sets.pdf",
              price: 0,
              grade: "Grade11",
            },
            sameConcept: "Sets",
          },
        ],
      },
    ];

    // Create grades and topics
    for (const grade of grades) {
      // Create grade node
      await session.run(
        `CREATE (g:SyllabusConcept {conceptId: $conceptId, name: $name, type: $type, description: $description, createdAt: $createdAt}) RETURN g`,
        {
          conceptId: grade.conceptId,
          name: grade.name,
          type: grade.type,
          description: grade.description,
          createdAt: currentTime,
        }
      );

      // Link grade to OLM001
      await session.run(
        `MATCH (s:SyllabusConcept {conceptId: $subjectId})
         MATCH (g:SyllabusConcept {conceptId: $gradeId})
         CREATE (s)-[:CONTAINS]->(g)`,
        { subjectId: olm001.conceptId, gradeId: grade.conceptId }
      );

      // Create topics under each grade
      for (const topic of grade.topics) {
        // Create topic node
        await session.run(
          `CREATE (t:SyllabusConcept {conceptId: $conceptId, name: $name, type: $type, description: $description, createdAt: $createdAt}) RETURN t`,
          {
            conceptId: topic.conceptId,
            name: topic.name,
            type: topic.type,
            description: topic.description,
            createdAt: currentTime,
          }
        );

        // Link topic to grade
        await session.run(
          `MATCH (g:SyllabusConcept {conceptId: $gradeId})
           MATCH (t:SyllabusConcept {conceptId: $topicId})
           CREATE (g)-[:CONTAINS]->(t)`,
          { gradeId: grade.conceptId, topicId: topic.conceptId }
        );

        // Create resource(s) for the topic
        const resources =
          topic.resources || (topic.resource ? [topic.resource] : []);
        for (const resource of resources) {
          const resourceId = uuidv4();
          await session.run(
            `CREATE (r:Resource {resourceId: $resourceId, title: $title, type: $type, url: $url, price: $price, grade: $grade, createdAt: $createdAt}) RETURN r`,
            {
              resourceId,
              title: resource.title,
              type: resource.type,
              url: resource.url,
              price: resource.price,
              grade: resource.grade,
              createdAt: currentTime,
            }
          );

          // Link resource to topic using EXPLAINS relationship
          await session.run(
            `MATCH (t:SyllabusConcept {conceptId: $topicId})
             MATCH (r:Resource {resourceId: $resourceId})
             CREATE (r)-[:EXPLAINS]->(t)`,
            { topicId: topic.conceptId, resourceId }
          );
        }

        // Create HAS_PREREQUISITE relationships for linkedConcepts
        for (const linkedConcept of topic.linkedConcepts || []) {
          await session.run(
            `MATCH (t:SyllabusConcept {conceptId: $topicId})
             MATCH (p:SyllabusConcept {conceptId: $linkedConceptId})
             CREATE (t)-[:HAS_PREREQUISITE]->(p)`,
            { topicId: topic.conceptId, linkedConceptId: linkedConcept }
          );
        }

        // Create SAME_AS relationship for sameConcept
        if (topic.sameConcept) {
          await session.run(
            `MATCH (t:SyllabusConcept {conceptId: $topicId})
             MATCH (other:SyllabusConcept {name: $sameConcept})
             WHERE t.conceptId <> other.conceptId
             CREATE (t)-[:SAME_AS]->(other)`,
            { topicId: topic.conceptId, sameConcept: topic.sameConcept }
          );
        }
      }
    }

    console.log("Database populated successfully!");
  } catch (error) {
    console.error("Error populating database:", error);
  } finally {
    await session.close();
    await driver.close();
  }
}

populateDatabase();
