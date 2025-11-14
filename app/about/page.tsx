export default function About() {
  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8" style={{color: 'var(--primary)'}}>
          About Us
        </h1>
        <div className="prose max-w-none">
          <p className="text-lg text-gray-700 mb-6">
            Welcome to GCSE Fast Track - your comprehensive revision guide designed to help students excel in their GCSE examinations.
          </p>
          
          <p className="text-gray-700 mb-6">
            Our platform provides carefully curated content, practice questions, and study materials across all major GCSE subjects to ensure you're fully prepared for your exams.
          </p>
          
          <p className="text-gray-700">
            Whether you're looking to boost your grades in Mathematics, master the sciences, or excel in languages and humanities, we're here to support your educational journey.
          </p>
        </div>
      </div>
    </div>
  );
}