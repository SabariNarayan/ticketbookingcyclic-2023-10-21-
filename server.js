const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const app = express();
const path = require('path'); 
app.use(express.json());
app.use(cors());
app.use(express.static('./dist/booking-app'));

// email authentication 
const transporter = nodemailer.createTransport({
  service: 'hotmail',
  // e.g., 'Gmail', 'Outlook', etc.
  auth: {
    user: 'sacnara611@hotmail.com', // Your email address
    pass: 'Sabari@123', // Your email password
  },
});

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://officialsabarinarayan:9447103050@cluster0.buyzcu4.mongodb.net/movie', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err));

// Define a User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' }
});

const User = mongoose.model('User', userSchema);

// define ticket schema 

const ticketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
  showtime: String,
  numOfTickets: Number,
  movieName: String,
  // Add other ticket-related fields
});

const Ticket = mongoose.model('Ticket', ticketSchema);

// define review schema

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
  rating: Number,
  text: String,
  // Add other review-related fields
});

const Review = mongoose.model('Review', reviewSchema);

// define Movie schema 

const movieSchema = new mongoose.Schema({
  movieName: {
    type: String,
    required: true,
  },
  image: {
    type: String, // You can store the image URL here
    required: true,
  },
  category: {
    type: String,
    enum: ['UA', 'A', 'PG', 'G'], // Example categories; modify as needed
    required: true,
  },
  languages: {
    type: [String], // Store languages as an array
    required: true,
  },
  cast: {
    type: [String], // Store cast members as an array
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  ticketRates: {
    type: Number,
    required: true,
  },
  seatsAvailable: {
    type: [Number],
    required: true,
  },
  averageRating: {
    type: Number,
    default: 0, // You can initialize this to 0
  },
  ticketsSoldPerDay: {
    type: [Number],
    default: 0, // You can initialize this to 0
  },
  movieTimings:{
    type: [String],
    required: true ,
  },

  totalSeats: {
    type: [Number],
    required: true,
  },

});

const Movie = mongoose.model('Movie', movieSchema);


// Register a new user
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});

// user login
app.post('/api', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({ message: 'Login failed: User not found' });
        return;
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (isPasswordValid) {
        // Generate a JWT token
        const token = jwt.sign({ userId: user._id, role: user.role , name: user.name}, '12345', { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token }); // Send token in the response
      } else {
        res.status(401).json({ message: 'Login failed: Incorrect password' });
      }
    } catch (error) {
      res.status(500).json({ error: 'An error occurred' });
    }
  });

  // Movie CRUD

  //post:

  app.post('/api/movies', async (req, res) => {
    try {
      const {
        movieName,
        image,
        category,
        languages,
        cast,
        description,
        ticketRates,
        seatsAvailable,
        averageRating,
        movieTimingsString,
        totalSeats
      } = req.body;

      const movieTimings = movieTimingsString.split(',');
      const ticketsSoldPerDay = Array(movieTimings.length).fill(0);
      
      // Create a new movie document using your Movie model
      const newMovie = new Movie({
        movieName,
        image,
        category,
        languages,
        cast,
        description,
        ticketRates,
        averageRating,
        ticketsSoldPerDay,
        movieTimings, 
        seatsAvailable: new Array(movieTimings.length).fill(totalSeats),
        totalSeats: new Array(movieTimings.length).fill(totalSeats),

        
      });
  
      // Save the movie to the database
      await newMovie.save();
  
      res.status(201).json(newMovie); // Return the newly created movie document as a response
    } catch (error) {
      console.error('Error creating movie:', error);
      res.status(500).json({ error: 'An error occurred while creating the movie.' });
    }
  });

  // GET Movie :
  app.get('/api/movies', async (req, res) => {
    try {
      const movies = await Movie.find(); // Fetch all movies from the database
      res.json(movies);
    } catch (error) {
      console.error('Error fetching movies:', error);
      res.status(500).json({ error: 'An error occurred while fetching movies.' });
    }
  });
   
  //get movie by id

  // Example route to get a movie by ID


app.get('/api/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.status(200).json(movie);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Moving', error: error.message });
  }
});
  // Delete Movie

  app.delete('/api/movies/:id', async (req, res) => {
    try {
      await Movie.findByIdAndRemove(req.params.id);
      await Ticket.deleteMany({ movieId: req.params.id });
      res.status(200).json({ message: 'Movie deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting Movie', error: error.message });
    }
  });
  
 //update movie
 app.put('/api/movies/:id', async (req, res) => {
  try { 
    const { id } = req.params; // Get the movie ID from the URL parameter
    const updatedMovieData = req.body; // Get the updated movie data from the request body

    // Find the movie by ID and update its details
    const updatedMovie = await Movie.findByIdAndUpdate(id, updatedMovieData, { new: true });

    if (!updatedMovie) {
      // If the movie with the given ID is not found, return a 404 error
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    // Respond with the updated movie object
    res.status(200).json(updatedMovie);
  } catch (error) {
    console.error('Error updating movie:', error);
    res.status(500).json({ error: 'An error occurred while updating the movie.' });
  }

  
});

// ticket booking and email service

// Import the necessary dependencies and setup your transporter as shown earlier

app.post('/api/movies/book-ticket/:id', async (req, res) => {
  try {
    const movieId = req.params.id;
    const { name, email, showtime, numOfTickets, userId, movieName } = req.body;

    // Find the movie by ID
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Check if the specified showtime is valid
    const showtimeIndex = movie.movieTimings.indexOf(showtime);
    if (showtimeIndex === -1) {
      return res.status(400).json({ message: 'Invalid showtime' });
    }

    // Calculate the number of tickets sold for this booking
    const numOfTicketsSold = parseInt(numOfTickets, 10);

    if (isNaN(numOfTicketsSold) || numOfTicketsSold <= 0) {
      return res.status(400).json({ message: 'Invalid number of tickets' });
    }

    if (movie.seatsAvailable[showtimeIndex] < numOfTicketsSold) {
      return res.status(400).json({ message: 'Not enough available seats for this showtime' });
    }

    const firstSeatNumber = movie.ticketsSoldPerDay[showtimeIndex] + 1;
    const lastSeatNumber = firstSeatNumber + numOfTicketsSold - 1;

    // Check if a ticket with the same showtime and userId exists
    const existingTicket = await Ticket.findOne({ showtime, userId });

    if (existingTicket) {
      // Update the existing ticket's numOfTickets
      existingTicket.numOfTickets += numOfTicketsSold;
      await existingTicket.save();
    } else {
      // Create a new Ticket object
      const newTicket = new Ticket({
        userId,
        movieId: movie._id,
        numOfTickets: numOfTicketsSold,
        showtime,
        movieName,
      });

      // Save the new ticket to the database
      await newTicket.save();
    }

    movie.ticketsSoldPerDay[showtimeIndex] += numOfTicketsSold;
    movie.seatsAvailable[showtimeIndex] -= numOfTicketsSold;

    // Save the updated movie details
    await movie.save();

    // Send email confirmation
    const emailOptions = {
      from: 'sacnara611@hotmail.com',
      to: email,
      subject: 'Ticket Confirmation',
      text: `Your ${numOfTicketsSold} ticket(s) for movie "${movie.movieName}" at ${showtime} have been booked. Seat numbers: ${firstSeatNumber} to ${lastSeatNumber}`,
    };

    // Send the email
    transporter.sendMail(emailOptions, (error, info) => {
      if (error) {
        console.error('Email sending failed:', error);
        return res.status(500).json({ message: 'Error sending email confirmation' });
      } else {
        console.log('Email sent:', info.response);
      }
    });

    // Save the updated movie details
    

    return res.status(200).json({
      message: 'Ticket(s) booked successfully',
      seatNumbers: [...Array(numOfTicketsSold).keys()].map((n) => firstSeatNumber + n),
    });
  } catch (error) {
    console.error('Error booking ticket:', error);
    return res.status(500).json({ message: 'Error booking ticket', error: error.message });
  }
});



// Define a route to get tickets by user ID
app.get('/api/tickets/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Find all tickets that match the user ID
    const tickets = await Ticket.find({ userId: userId });
    
    res.status(200).json(tickets);
  } catch (error) {
    console.error('Error fetching tickets by user ID:', error);
    res.status(500).json({ message: 'Error fetching tickets', error: error.message });
  }
});

// Cancel ticket 

app.post('/api/movies/cancel-ticket/:id', async (req, res) => {
  try {
    const ticketId = req.params.id;
    
    // Find the ticket by ID
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const { userId, showtime, numOfTickets } = ticket;

    // Find the corresponding movie
    const movie = await Movie.findById(ticket.movieId);

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Check if the showtime is valid
    const showtimeIndex = movie.movieTimings.indexOf(showtime);
    if (showtimeIndex === -1) {
      return res.status(400).json({ message: 'Invalid showtime' });
    }
    
    const databaseUserId = userId.toString();
    if (databaseUserId !== req.body.userId) {
      console.log('Frontend userId:', req.body.userId);
      console.log('Database userId:', userId);
    return res.status(403).json({ message: 'User is not authorized to cancel these tickets' });
}
    // Verify that the user has the right to cancel these tickets
    

    const numOfTicketsCancelled = parseInt(numOfTickets, 10);

    // Update seatsAvailable and ticketsSoldPerDay for the showtime
    movie.seatsAvailable[showtimeIndex] += numOfTicketsCancelled;
    movie.ticketsSoldPerDay[showtimeIndex] -= numOfTicketsCancelled;

    // Delete the ticket
    await Ticket.findByIdAndDelete(ticketId);

    // Save the updated movie details
    await movie.save();

    return res.status(200).json({ message: 'Ticket(s) canceled successfully' });
  } catch (error) {
    console.error('Error canceling ticket:', error);
    return res.status(500).json({ message: 'Error canceling ticket', error: error.message });
  }
});



  const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

  
app.get('/*', function (req,res) {
  res.sendFile(path.join(__dirname + '/dist/booking-app/index.html'));
});
