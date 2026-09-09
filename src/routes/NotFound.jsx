import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="wrap sheet">
      <h1>Not found</h1>
      {/* A word inside a sentence: the inline exemption, marked rather than
          implied. */}
      <p className="lede">That page does not exist. <Link className="tap-exempt" to="/">Back to modules</Link>.</p>
    </div>
  );
}
