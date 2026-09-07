import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="wrap">
      <h2>Not found</h2>
      <p className="lede">That page does not exist. <Link to="/">Back to modules</Link>.</p>
    </div>
  );
}
