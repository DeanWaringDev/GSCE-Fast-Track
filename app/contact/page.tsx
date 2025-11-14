export default function Contact() {
  return (
    <div className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8" style={{color: 'var(--primary)'}}>
          Contact Us
        </h1>
        
        <form className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
              Name
            </label>
            <input
              type="text"
              id="name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              style={{'--tw-ring-color': 'var(--secondary)'} as React.CSSProperties}
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              style={{'--tw-ring-color': 'var(--secondary)'} as React.CSSProperties}
            />
          </div>
          
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2" style={{color: 'var(--text)'}}>
              Message
            </label>
            <textarea
              id="message"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              style={{'--tw-ring-color': 'var(--secondary)'} as React.CSSProperties}
            ></textarea>
          </div>
          
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-md text-white font-medium hover:opacity-90 transition-opacity"
            style={{backgroundColor: 'var(--secondary)'}}
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}